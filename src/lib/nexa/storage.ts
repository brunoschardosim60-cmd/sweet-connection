import { sitesDemo } from "./demo";
import type { EnvioFormulario, Site } from "./types";

/**
 * Camada de persistência.
 * Hoje: localStorage. Amanhã: basta criar outro adaptador que implemente
 * `NexaRepository` (ex.: SupabaseRepository) e trocar `repo` abaixo.
 */
export interface NexaRepository {
  listarSites(): Promise<Site[]>;
  salvarSites(sites: Site[]): Promise<void>;
  listarEnvios(): Promise<EnvioFormulario[]>;
  salvarEnvios(envios: EnvioFormulario[]): Promise<void>;
}

const CHAVE_SITES = "nexa.sites.v1";
const CHAVE_ENVIOS = "nexa.envios.v1";
export const CHAVE_PREFS = "nexa.prefs.v1";

const temStorage = () => typeof window !== "undefined" && !!window.localStorage;

function ler<T>(chave: string, padrao: T): T {
  if (!temStorage()) return padrao;
  try {
    const bruto = window.localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : padrao;
  } catch {
    return padrao;
  }
}

function gravar(chave: string, valor: unknown) {
  if (!temStorage()) return;
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* cota excedida — ignorado no protótipo */
  }
}

export const localRepository: NexaRepository = {
  async listarSites() {
    return ler<Site[]>(CHAVE_SITES, []);
  },
  async salvarSites(sites) {
    gravar(CHAVE_SITES, sites);
  },
  async listarEnvios() {
    return ler<EnvioFormulario[]>(CHAVE_ENVIOS, []);
  },
  async salvarEnvios(envios) {
    gravar(CHAVE_ENVIOS, envios);
  },
};

export const repo: NexaRepository = localRepository;

/* ---------------- store reativa ---------------- */

type Estado = { sites: Site[]; envios: EnvioFormulario[]; pronto: boolean };

let estado: Estado = { sites: [], envios: [], pronto: false };
const ouvintes = new Set<() => void>();

const notificar = () => ouvintes.forEach((fn) => fn());

const definir = (parcial: Partial<Estado>) => {
  estado = { ...estado, ...parcial };
  notificar();
};

export const store = {
  subscribe(fn: () => void) {
    ouvintes.add(fn);
    return () => ouvintes.delete(fn);
  },
  get: () => estado,
  async carregar(seedSeVazio = true) {
    if (estado.pronto) return;
    let sites = await repo.listarSites();
    if (sites.length === 0 && seedSeVazio) {
      sites = sitesDemo();
      await repo.salvarSites(sites);
    }
    const envios = await repo.listarEnvios();
    definir({ sites, envios, pronto: true });
  },
  async persistir(sites: Site[]) {
    definir({ sites });
    await repo.salvarSites(sites);
  },
  async adicionarSite(site: Site) {
    await store.persistir([site, ...estado.sites]);
  },
  async atualizarSite(id: string, patch: Partial<Site> | ((s: Site) => Site)) {
    const sites = estado.sites.map((s) => {
      if (s.id !== id) return s;
      const novo = typeof patch === "function" ? patch(s) : { ...s, ...patch };
      return { ...novo, atualizadoEm: new Date().toISOString() };
    });
    await store.persistir(sites);
  },
  async removerSite(id: string) {
    await store.persistir(estado.sites.filter((s) => s.id !== id));
  },
  async registrarEnvio(envio: EnvioFormulario) {
    const envios = [envio, ...estado.envios];
    definir({ envios });
    await repo.salvarEnvios(envios);
  },
  async restaurarDemo() {
    const sites = sitesDemo();
    await store.persistir(sites);
  },
  async limpar() {
    await store.persistir([]);
  },
};
