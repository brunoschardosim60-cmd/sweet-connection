/**
 * Contador local de desempenho dos mini-sites publicados.
 * Registra visitas e cliques (WhatsApp, links, produtos) no localStorage
 * do navegador. Serve como métrica real, ao lado dos dados simulados.
 */

export interface RegistroDia {
  dia: string;
  visitas: number;
  cliques: number;
}

export interface DesempenhoSite {
  visitas: number;
  cliques: number;
  cliquesWhatsapp: number;
  porLink: Record<string, number>;
  dias: RegistroDia[];
  ultimaVisita?: string;
}

const CHAVE = "nexa.analytics.v1";

const vazio = (): DesempenhoSite => ({
  visitas: 0,
  cliques: 0,
  cliquesWhatsapp: 0,
  porLink: {},
  dias: [],
});

type Mapa = Record<string, DesempenhoSite>;

const temStorage = () => typeof window !== "undefined" && !!window.localStorage;

function lerTudo(): Mapa {
  if (!temStorage()) return {};
  try {
    return JSON.parse(window.localStorage.getItem(CHAVE) ?? "{}") as Mapa;
  } catch {
    return {};
  }
}

function gravarTudo(mapa: Mapa) {
  if (!temStorage()) return;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(mapa));
  } catch {
    /* cota excedida — ignorado */
  }
}

const ouvintes = new Set<() => void>();
const notificar = () => ouvintes.forEach((fn) => fn());

const hoje = () => new Date().toISOString().slice(0, 10);

function atualizar(siteId: string, fn: (d: DesempenhoSite) => DesempenhoSite) {
  const mapa = lerTudo();
  const atual = mapa[siteId] ?? vazio();
  mapa[siteId] = fn({ ...atual, porLink: { ...atual.porLink }, dias: [...atual.dias] });
  gravarTudo(mapa);
  notificar();
}

function somarDia(dias: RegistroDia[], campo: "visitas" | "cliques") {
  const d = hoje();
  const idx = dias.findIndex((x) => x.dia === d);
  if (idx === -1) return [...dias, { dia: d, visitas: 0, cliques: 0, [campo]: 1 } as RegistroDia].slice(-60);
  const copia = [...dias];
  copia[idx] = { ...copia[idx]!, [campo]: (copia[idx]![campo] ?? 0) + 1 };
  return copia;
}

export const analytics = {
  subscribe(fn: () => void) {
    ouvintes.add(fn);
    return () => ouvintes.delete(fn);
  },
  tudo: lerTudo,
  doSite(siteId: string): DesempenhoSite {
    return lerTudo()[siteId] ?? vazio();
  },
  registrarVisita(siteId: string) {
    atualizar(siteId, (d) => ({
      ...d,
      visitas: d.visitas + 1,
      ultimaVisita: new Date().toISOString(),
      dias: somarDia(d.dias, "visitas"),
    }));
  },
  registrarClique(siteId: string, rotulo: string, whatsapp = false) {
    atualizar(siteId, (d) => ({
      ...d,
      cliques: d.cliques + 1,
      cliquesWhatsapp: d.cliquesWhatsapp + (whatsapp ? 1 : 0),
      porLink: { ...d.porLink, [rotulo]: (d.porLink[rotulo] ?? 0) + 1 },
      dias: somarDia(d.dias, "cliques"),
    }));
  },
  limpar(siteId?: string) {
    if (!siteId) {
      gravarTudo({});
    } else {
      const mapa = lerTudo();
      delete mapa[siteId];
      gravarTudo(mapa);
    }
    notificar();
  },
};
