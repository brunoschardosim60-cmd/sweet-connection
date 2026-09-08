import type { GrupoOpcaoProduto } from "./types";
/** Somente demonstrações: estes exemplos nunca entram no rascunho do cliente. */
export function opcoesDemonstracao(modelo: string): GrupoOpcaoProduto[] {
  if (modelo === "cardapio-hamburgueria")
    return [
      {
        id: "tamanho",
        nome: "Tamanho",
        minimo: 1,
        maximo: 1,
        opcoes: [
          { id: "padrao", nome: "Padrão", acrescimo: 0 },
          { id: "duplo", nome: "Duplo", acrescimo: 8 },
        ],
      },
      {
        id: "adicionais",
        nome: "Adicionais",
        minimo: 0,
        maximo: 2,
        opcoes: [
          { id: "queijo", nome: "Queijo extra", acrescimo: 3 },
          { id: "bacon", nome: "Bacon extra", acrescimo: 5 },
        ],
      },
    ];
  if (modelo === "cardapio-pizzaria")
    return [
      {
        id: "tamanho",
        nome: "Tamanho",
        minimo: 1,
        maximo: 1,
        opcoes: [
          { id: "media", nome: "Média", acrescimo: 0 },
          { id: "grande", nome: "Grande", acrescimo: 15 },
        ],
      },
      {
        id: "borda",
        nome: "Borda",
        minimo: 0,
        maximo: 1,
        opcoes: [
          { id: "tradicional", nome: "Tradicional", acrescimo: 0 },
          { id: "recheada", nome: "Recheada", acrescimo: 8 },
        ],
      },
    ];
  if (modelo === "cardapio-doceria")
    return [
      {
        id: "embalagem",
        nome: "Embalagem",
        minimo: 1,
        maximo: 1,
        opcoes: [
          { id: "padrao", nome: "Padrão", acrescimo: 0 },
          { id: "presente", nome: "Para presente", acrescimo: 5 },
        ],
      },
    ];
  return [];
}
