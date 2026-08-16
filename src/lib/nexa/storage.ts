import { supabaseRepository } from "./supabase-repository";
import { midiaStore } from "./media";
import type { EnvioFormulario, Site, StatusSite } from "./types";

// Kept only for harmless interface preferences (filters/theme), never business data.
export const CHAVE_PREFS = "nexa.prefs.v1";

type Estado = {
  sites: Site[];
  envios: EnvioFormulario[];
  pronto: boolean;
  carregando: boolean;
  erro: string | null;
  ownerId: string | null;
};

const inicial: Estado = {
  sites: [],
  envios: [],
  pronto: false,
  carregando: false,
  erro: null,
  ownerId: null,
};

let estado: Estado = inicial;
const ouvintes = new Set<() => void>();
const notificar = () => ouvintes.forEach((fn) => fn());
const definir = (parcial: Partial<Estado>) => {
  estado = { ...estado, ...parcial };
  notificar();
};

function substituir(site: Site) {
  definir({ sites: estado.sites.map((item) => (item.id === site.id ? site : item)) });
}

function erroDesconhecido(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível acessar os dados.";
}

export const store = {
  subscribe(fn: () => void) {
    ouvintes.add(fn);
    return () => ouvintes.delete(fn);
  },
  get: () => estado,
  reset() {
    estado = inicial;
    notificar();
  },
  async carregar(forcar = false) {
    if (estado.carregando) return;
    definir({ carregando: true, erro: null });
    try {
      const ownerId = await supabaseRepository.usuarioAtual();
      if (estado.ownerId && estado.ownerId !== ownerId) {
        estado = { ...inicial, carregando: true, ownerId };
        notificar();
      }
      if (estado.pronto && !forcar && estado.ownerId === ownerId) {
        definir({ carregando: false });
        return;
      }
      const [sites, envios] = await Promise.all([
        supabaseRepository.listarSites(),
        supabaseRepository.listarEnvios(),
      ]);
      definir({ sites, envios, pronto: true, carregando: false, ownerId });
    } catch (error) {
      definir({
        sites: [],
        envios: [],
        pronto: true,
        carregando: false,
        erro: erroDesconhecido(error),
      });
    }
  },
  async adicionarSite(site: Site) {
    const salvo = await supabaseRepository.salvarSite(site);
    definir({ sites: [salvo, ...estado.sites] });
    return salvo;
  },
  async atualizarSite(id: string, patch: Partial<Site> | ((site: Site) => Site)) {
    const atual = estado.sites.find((site) => site.id === id);
    if (!atual) throw new Error("Mini-site não encontrado.");
    const proximo = typeof patch === "function" ? patch(atual) : { ...atual, ...patch };
    const salvo = await supabaseRepository.salvarSite({
      ...proximo,
      atualizadoEm: new Date().toISOString(),
    });
    substituir(salvo);
    return salvo;
  },
  async publicarSite(site: Site) {
    const salvo = await supabaseRepository.publicarSite(site);
    substituir(salvo);
    return salvo;
  },
  async definirStatus(site: Site, status: Exclude<StatusSite, "publicado">) {
    const salvo = await supabaseRepository.definirStatus(site, status);
    substituir(salvo);
    return salvo;
  },
  async removerSite(id: string) {
    await supabaseRepository.removerSite(id);
    definir({ sites: estado.sites.filter((site) => site.id !== id) });
  },
  async definirStatusEnvio(id: string, status: EnvioFormulario["status"]) {
    const confirmado = await supabaseRepository.definirStatusEnvio(id, status);
    definir({
      envios: estado.envios.map((envio) =>
        envio.id === id ? { ...envio, status: confirmado } : envio,
      ),
    });
  },
  async limpar() {
    await midiaStore.removerTudo();
    await supabaseRepository.limparTudo();
    definir({ sites: [], envios: [] });
  },
};
