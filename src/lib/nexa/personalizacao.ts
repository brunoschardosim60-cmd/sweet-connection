import type { EscolhaProduto, GrupoOpcaoProduto, Produto } from "./types";
import { produtoDisponivelAgora, type ItemCarrinho } from "./catalogo";

export interface LinhaPedido {
  produtoId?: string;
  quantidade: number;
  observacao: string;
  escolhas?: EscolhaProduto[];
}
export type CarrinhoPersonalizado = Record<string, LinhaPedido>;

export function itensDoCarrinho(
  carrinho: CarrinhoPersonalizado,
  produtos: Produto[],
): ItemCarrinho[] {
  return Object.entries(carrinho).flatMap<ItemCarrinho>(([id, linha]) => {
    const p = produtos.find((p) => p.id === (linha.produtoId ?? id));
    if (!p)
      return [
        {
          linhaId: id,
          produtoId: linha.produtoId ?? id,
          nome: "Produto removido do cardápio",
          quantidade: linha.quantidade,
          preco: 0,
          erro: "Este produto não está mais disponível.",
        },
      ];
    const escolhas = linha.escolhas ?? [];
    const calculo = calcularPersonalizacao(p, escolhas);
    if (!produtoDisponivelAgora(p)) calculo.erro = "Este produto não está disponível agora.";
    return [
      {
        linhaId: id,
        produtoId: p.id,
        nome: p.nome,
        preco: calculo.preco,
        quantidade: linha.quantidade,
        escolhas,
        observacaoLivre: linha.observacao,
        observacao: [...calculo.rotulos, linha.observacao].filter(Boolean).join(" · "),
        ...(calculo.erro ? { erro: calculo.erro } : {}),
      },
    ];
  });
}

export function gruposProduto(produto: Produto): GrupoOpcaoProduto[] {
  if (produto.personalizacoes?.length) return produto.personalizacoes;
  return produto.variacoes.length
    ? [
        {
          id: "variacao",
          nome: "Variação",
          minimo: 0,
          maximo: 1,
          opcoes: produto.variacoes.map((nome, i) => ({ id: String(i), nome, acrescimo: 0 })),
        },
      ]
    : [];
}

/** Valida IDs, limites e acréscimos; o servidor repete a validação autoritativa. */
export function calcularPersonalizacao(produto: Produto, escolhas: EscolhaProduto[]) {
  const grupos = gruposProduto(produto);
  const unicas = new Set<string>();
  const rotulos: string[] = [];
  let centavos = Math.round((produto.precoPromocional || produto.preco) * 100);
  let erro = "";
  for (const escolha of escolhas) {
    const grupo = grupos.find((g) => g.id === escolha.grupoId);
    const opcao = grupo?.opcoes.find((o) => o.id === escolha.opcaoId);
    const chave = JSON.stringify([escolha.grupoId, escolha.opcaoId]);
    if (
      !grupo ||
      !opcao ||
      unicas.has(chave) ||
      !Number.isFinite(opcao.acrescimo) ||
      opcao.acrescimo < 0
    ) {
      erro = "Revise as opções deste item.";
      continue;
    }
    unicas.add(chave);
    centavos += Math.round(opcao.acrescimo * 100);
    rotulos.push(`${grupo.nome}: ${opcao.nome}`);
  }
  for (const grupo of grupos) {
    const quantidade = escolhas.filter((e) => e.grupoId === grupo.id).length;
    if (quantidade < grupo.minimo)
      erro = `Escolha pelo menos ${grupo.minimo} opção em ${grupo.nome}.`;
    if (quantidade > grupo.maximo) erro = `Escolha até ${grupo.maximo} opção em ${grupo.nome}.`;
  }
  return { preco: centavos / 100, rotulos, erro };
}

export function chaveLinha(produtoId: string, escolhas: EscolhaProduto[], observacao: string) {
  return JSON.stringify([
    produtoId,
    escolhas
      .map((e) => [e.grupoId, e.opcaoId])
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    observacao.trim(),
  ]);
}

export function adicionarLinha(
  carrinho: CarrinhoPersonalizado,
  produto: Produto,
  escolhas: EscolhaProduto[] = [],
  observacao = "",
  quantidade = 1,
): CarrinhoPersonalizado {
  const calculo = calcularPersonalizacao(produto, escolhas);
  if (
    calculo.erro ||
    !produtoDisponivelAgora(produto) ||
    !Number.isInteger(quantidade) ||
    quantidade < 1
  )
    return carrinho;
  const total = Object.entries(carrinho).reduce(
    (n, [id, l]) => n + ((l.produtoId ?? id) === produto.id ? l.quantidade : 0),
    0,
  );
  if (total + quantidade > Math.min(30, produto.estoque ?? 30)) return carrinho;
  const id = chaveLinha(produto.id, escolhas, observacao.trim().slice(0, 500));
  return {
    ...carrinho,
    [id]: {
      produtoId: produto.id,
      quantidade: (carrinho[id]?.quantidade ?? 0) + quantidade,
      observacao: observacao.trim().slice(0, 500),
      escolhas,
    },
  };
}

/** Migra apenas em memória; rascunhos antigos usam o ID do produto como chave. */
export function normalizarLinhas(carrinho: CarrinhoPersonalizado): CarrinhoPersonalizado {
  return Object.fromEntries(
    Object.entries(carrinho)
      .filter(([, l]) => l && Number.isInteger(l.quantidade) && l.quantidade > 0)
      .map(([id, l]) => [
        id,
        {
          ...l,
          produtoId: l.produtoId ?? id,
          observacao: String(l.observacao ?? "").slice(0, 500),
          escolhas: Array.isArray(l.escolhas)
            ? l.escolhas.filter(
                (e) => e && typeof e.grupoId === "string" && typeof e.opcaoId === "string",
              )
            : [],
        },
      ]),
  );
}
