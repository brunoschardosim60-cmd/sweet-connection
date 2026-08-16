export type TeclaNavegacaoBusca = "ArrowDown" | "ArrowUp";

/** Calcula a próxima opção da busca, incluindo a volta entre início e fim. */
export function proximoIndiceBusca(
  atual: number,
  total: number,
  tecla: TeclaNavegacaoBusca,
): number {
  if (total <= 0) return -1;
  if (tecla === "ArrowDown") return (atual + 1 + total) % total;
  return atual <= 0 ? total - 1 : atual - 1;
}
