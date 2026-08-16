import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Site } from "./types";

export interface Versao {
  id: string;
  siteId: string;
  criadoEm: string;
  rotulo: string;
  origem: "manual" | "salvamento" | "publicacao" | "importacao";
  dados: Site;
}

type VersionRow = {
  id: string;
  minisite_id: string;
  created_at: string;
  label: string;
  origin: Versao["origem"];
  content: Json;
};

let cache: Record<string, Versao[]> = {};
const VERSOES_VAZIAS: Versao[] = [];
const carregando = new Set<string>();
const ouvintes = new Set<() => void>();
const notificar = () => ouvintes.forEach((fn) => fn());

function paraVersao(row: VersionRow): Versao {
  return {
    id: row.id,
    siteId: row.minisite_id,
    criadoEm: row.created_at,
    rotulo: row.label,
    origem: row.origin,
    dados: row.content as unknown as Site,
  };
}

function rotuloPadrao(origem: Versao["origem"]) {
  return origem === "publicacao"
    ? "Publicação"
    : origem === "importacao"
      ? "Importação de JSON"
      : origem === "manual"
        ? "Ponto de restauração"
        : "Salvamento manual";
}

export const versaoStore = {
  subscribe(fn: () => void) {
    ouvintes.add(fn);
    return () => ouvintes.delete(fn);
  },
  tudo: () => cache,
  listar: (siteId: string) => cache[siteId] ?? VERSOES_VAZIAS,
  snapshotVazio: () => VERSOES_VAZIAS,
  async carregar(siteId: string, forcar = false) {
    if (carregando.has(siteId) || (!forcar && siteId in cache)) return;
    carregando.add(siteId);
    try {
      const { data, error } = await supabase
        .from("minisite_versions")
        .select("id,minisite_id,created_at,label,origin,content")
        .eq("minisite_id", siteId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      cache = { ...cache, [siteId]: data.map((row) => paraVersao(row as VersionRow)) };
      notificar();
    } finally {
      carregando.delete(siteId);
    }
  },
  async registrar(site: Site, origem: Versao["origem"], rotulo?: string) {
    const { data, error } = await supabase.rpc("save_minisite_version", {
      requested_site_id: site.id,
      requested_origin: origem,
      requested_label: rotulo ?? rotuloPadrao(origem),
      requested_content: site as unknown as Json,
    });
    if (error) throw new Error(error.message);
    const versao = paraVersao(data as VersionRow);
    cache = { ...cache, [site.id]: [versao, ...(cache[site.id] ?? [])].slice(0, 20) };
    notificar();
    return versao;
  },
  async remover(siteId: string, versaoId: string) {
    const { error } = await supabase.from("minisite_versions").delete().eq("id", versaoId);
    if (error) throw new Error(error.message);
    cache = {
      ...cache,
      [siteId]: (cache[siteId] ?? []).filter((versao) => versao.id !== versaoId),
    };
    notificar();
  },
  async limpar(siteId: string) {
    const { error } = await supabase.from("minisite_versions").delete().eq("minisite_id", siteId);
    if (error) throw new Error(error.message);
    cache = { ...cache, [siteId]: [] };
    notificar();
  },
  reset() {
    cache = {};
    carregando.clear();
    notificar();
  },
};
