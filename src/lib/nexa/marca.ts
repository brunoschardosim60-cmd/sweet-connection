import { brand } from "./brand";

/**
 * White label: identidade da plataforma editável pelo proprietário.
 * Persistida no navegador — a marca padrão vem de `brand.ts`.
 */
export interface Marca {
  nome: string;
  slogan: string;
  dominio: string;
  emailContato: string;
  whatsappComercial: string;
  instagram: string;
  assinatura: string;
  /** Exibe (ou não) a assinatura da plataforma no rodapé dos mini-sites. */
  mostrarAssinatura: boolean;
  /** Logo própria (URL ou DataURL). Vazio usa o símbolo padrão. */
  logo: string;
}

export const marcaPadrao: Marca = {
  nome: brand.nome,
  slogan: brand.slogan,
  dominio: brand.dominio,
  emailContato: brand.emailContato,
  whatsappComercial: brand.whatsappComercial,
  instagram: brand.instagram,
  assinatura: brand.assinatura,
  mostrarAssinatura: true,
  logo: "",
};

const CHAVE = "nexa.marca.v1";

const ler = (): Marca => {
  if (typeof window === "undefined") return marcaPadrao;
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    return bruto ? { ...marcaPadrao, ...(JSON.parse(bruto) as Partial<Marca>) } : marcaPadrao;
  } catch {
    return marcaPadrao;
  }
};

let cache: Marca | null = null;
const ouvintes = new Set<() => void>();

export const marcaStore = {
  subscribe(fn: () => void) {
    ouvintes.add(fn);
    return () => ouvintes.delete(fn);
  },
  /** Snapshot estável para useSyncExternalStore. */
  get: (): Marca => (cache ??= ler()),
  servidor: () => marcaPadrao,
  salvar(patch: Partial<Marca>) {
    const nova = { ...marcaStore.get(), ...patch };
    cache = nova;
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(nova));
    } catch {
      /* cota excedida */
    }
    ouvintes.forEach((fn) => fn());
  },
  restaurar() {
    cache = marcaPadrao;
    try {
      window.localStorage.removeItem(CHAVE);
    } catch {
      /* ignorado */
    }
    ouvintes.forEach((fn) => fn());
  },
};

/** Domínio de publicação normalizado (sem protocolo e sem barra final). */
export const hostMarca = (m: Marca) =>
  m.dominio.replace(/^https?:\/\//, "").replace(/\/+$/, "") || brand.dominio;
