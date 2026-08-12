import type { Site } from "./types";
import { slugify, uid } from "./utils";

export const VERSAO_ARQUIVO = 1;

export interface ArquivoNexa {
  formato: "nexa-minisite";
  versao: number;
  exportadoEm: string;
  site: Site;
}

export function montarArquivo(site: Site): ArquivoNexa {
  return {
    formato: "nexa-minisite",
    versao: VERSAO_ARQUIVO,
    exportadoEm: new Date().toISOString(),
    site: structuredClone(site),
  };
}

export function baixarJson(site: Site) {
  const conteudo = JSON.stringify(montarArquivo(site), null, 2);
  const blob = new Blob([conteudo], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nexa-${site.slug || slugify(site.conteudo.nome) || "mini-site"}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function lerArquivo(texto: string): Site {
  const bruto = JSON.parse(texto) as ArquivoNexa | Site;
  const site = (bruto as ArquivoNexa).formato === "nexa-minisite" ? (bruto as ArquivoNexa).site : (bruto as Site);
  if (!site || typeof site !== "object" || !site.conteudo || !site.aparencia)
    throw new Error("Arquivo inválido: não parece uma configuração de mini-site Nexa.");
  return site;
}

/** Aplica um JSON importado sobre um site existente, preservando id/slug/cliente. */
export function mesclarImportacao(atual: Site, importado: Site): Site {
  return {
    ...importado,
    id: atual.id,
    slug: atual.slug,
    status: atual.status,
    criadoEm: atual.criadoEm,
    atualizadoEm: new Date().toISOString(),
    cliente: atual.cliente,
    metricas: atual.metricas,
  };
}

/** Cria uma cópia independente do site importado (novo cliente). */
export function duplicarImportacao(importado: Site, slugExistentes: string[]): Site {
  let slug = slugify(importado.slug || importado.conteudo.nome) || "mini-site";
  let n = 2;
  while (slugExistentes.includes(slug)) slug = `${slugify(importado.conteudo.nome)}-${n++}`;
  return {
    ...structuredClone(importado),
    id: uid("site"),
    slug,
    status: "rascunho",
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };
}
