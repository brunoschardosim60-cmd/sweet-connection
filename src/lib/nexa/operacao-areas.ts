export type RecursosOperacao = { pedidos: boolean; agenda: boolean; solicitacoes: boolean };
export type AbaOperacao =
  "Pedidos" | "Agenda" | "Solicitações" | "Estatísticas" | "Equipe e acessos";

/** Existing records stay reachable even after a feature is switched off. */
export function abasDaOperacao(
  dados: {
    recursosOperacao?: RecursosOperacao;
    pedidos: unknown[];
    agenda: unknown[];
    solicitacoes: unknown[];
  },
  dono: boolean,
): AbaOperacao[] {
  const recursos = dados.recursosOperacao;
  return [
    ...(!recursos || recursos.pedidos || dados.pedidos.length ? ["Pedidos" as const] : []),
    ...(!recursos || recursos.agenda || dados.agenda.length ? ["Agenda" as const] : []),
    ...(!recursos || recursos.solicitacoes || dados.solicitacoes.length
      ? ["Solicitações" as const]
      : []),
    "Estatísticas",
    ...(dono ? ["Equipe e acessos" as const] : []),
  ];
}

export function abaDisponivel(aba: string, abas: AbaOperacao[]): AbaOperacao {
  return abas.find((item) => item === aba) ?? abas[0] ?? "Estatísticas";
}
