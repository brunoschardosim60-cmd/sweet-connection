import type { Site } from "./types";
import { uid } from "./utils";

export interface Versao {
  id: string;
  siteId: string;
  criadoEm: string;
  rotulo: string;
  origem: "manual" | "salvamento" | "publicacao" | "importacao";
  dados: Site;
}

const CHAVE = "nexa.versoes.v1";
const MAXIMO = 20;

const temStorage = () => typeof window !== "undefined" && !!window.localStorage;

function lerTudo(): Record<string, Versao[]> {
  if (!temStorage()) return {};
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as Record<string, Versao[]>) : {};
  } catch {
    return {};
  }
}

let cache: Record<string, Versao[]> | null = null;
const ouvintes = new Set<() => void>();
const notificar = () => ouvintes.forEach((fn) => fn());

function gravar(dados: Record<string, Versao[]>) {
  cache = dados;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch {
    /* cota — ignorado */
  }
  notificar();
}

export const versaoStore = {
  subscribe(fn: () => void) {
    ouvintes.add(fn);
    return () => ouvintes.delete(fn);
  },
  tudo(): Record<string, Versao[]> {
    if (cache === null) cache = lerTudo();
    return cache;
  },
  listar(siteId: string): Versao[] {
    return versaoStore.tudo()[siteId] ?? [];
  },
  registrar(site: Site, origem: Versao["origem"], rotulo?: string) {
    const tudo = { ...versaoStore.tudo() };
    const anteriores = tudo[site.id] ?? [];
    const versao: Versao = {
      id: uid("ver"),
      siteId: site.id,
      criadoEm: new Date().toISOString(),
      rotulo: rotulo ?? rotuloPadrao(origem),
      origem,
      dados: structuredClone(site),
    };
    tudo[site.id] = [versao, ...anteriores].slice(0, MAXIMO);
    gravar(tudo);
    return versao;
  },
  remover(siteId: string, versaoId: string) {
    const tudo = { ...versaoStore.tudo() };
    tudo[siteId] = (tudo[siteId] ?? []).filter((v) => v.id !== versaoId);
    gravar(tudo);
  },
  limpar(siteId: string) {
    const tudo = { ...versaoStore.tudo() };
    delete tudo[siteId];
    gravar(tudo);
  },
};

function rotuloPadrao(origem: Versao["origem"]) {
  return origem === "publicacao"
    ? "Publicação"
    : origem === "importacao"
      ? "Importação de JSON"
      : origem === "manual"
        ? "Ponto de restauração"
        : "Salvamento automático";
}
