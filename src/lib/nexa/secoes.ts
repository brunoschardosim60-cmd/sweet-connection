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
