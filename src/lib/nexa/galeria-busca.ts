export type TipoModelo = "minisite" | "cardapio" | "ia";

export function buscaGaleria(search: Record<string, unknown>): { tipo?: TipoModelo } {
  const tipo = search["tipo"];
  return tipo === "minisite" || tipo === "cardapio" || tipo === "ia" ? { tipo } : {};
}
