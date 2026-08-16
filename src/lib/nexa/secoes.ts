import type { Site } from "@/lib/nexa/types";

/**
 * Regras puras de exibição de seções do mini-site.
 * Alguns tipos compartilham o mesmo bloco visual (cardápio/produtos e
 * promoção/cupom); mantemos apenas a primeira ocorrência de cada grupo para
 * que o conteúdo não apareça duplicado na página pública.
 */

export const grupoDeSecao = (tipo: string): string =>
  tipo === "cardapio" ? "produtos" : tipo === "promocao" ? "cupom" : tipo;

export function secoesSemDuplicadas<T extends { tipo: string }>(secoes: T[]): T[] {
  const vistos = new Set<string>();
  return secoes.filter((s) => {
    const grupo = grupoDeSecao(s.tipo);
    if (vistos.has(grupo)) return false;
    vistos.add(grupo);
    return true;
  });
}

/** Indica se uma seção baseada em itens já tem algo para renderizar. */
export function secaoTemConteudo(site: Site, tipo: string): boolean {
  switch (grupoDeSecao(tipo)) {
    case "links":
      return site.links.some((item) => item.ativo);
    case "produtos":
      return site.produtos.length > 0;
    case "servicos":
      return site.servicos.length > 0;
    case "galeria":
      return site.galeria.length > 0;
    case "videos":
      return (site.videos?.length ?? 0) > 0;
    case "depoimentos":
      return site.depoimentos.length > 0;
    case "equipe":
      return site.equipe.length > 0;
    case "cupom":
      return site.cupons.some((item) => item.ativo);
    case "faq":
      return site.faq.length > 0;
    case "formulario":
      return site.formulario.campos.length > 0;
    default:
      return true;
  }
}
