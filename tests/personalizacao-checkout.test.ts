import { describe, expect, it } from "vitest";
import {
  adicionarLinha,
  calcularPersonalizacao,
  itensDoCarrinho,
  normalizarLinhas,
} from "@/lib/nexa/personalizacao";
import {
  erroEtapaCheckout,
  rotuloTaxa,
  taxaConhecida,
  type CamposEntrega,
} from "@/lib/nexa/checkout";
import { acaoNegocio } from "@/lib/nexa/acao-negocio";
import { siteDoModelo } from "@/lib/nexa/demo-modelos";
import type { Produto } from "@/lib/nexa/types";

export const produtoTeste: Produto = {
  id: "burger",
  nome: "Burger",
  descricao: "",
  preco: 30,
  categoria: "Burger",
  variacoes: [],
  disponivel: true,
  destaque: false,
  estoque: 4,
  personalizacoes: [
    {
      id: "tamanho",
      nome: "Tamanho",
      minimo: 1,
      maximo: 1,
      opcoes: [
        { id: "normal", nome: "Normal", acrescimo: 0 },
        { id: "duplo", nome: "Duplo", acrescimo: 8 },
      ],
    },
    {
      id: "adicional",
      nome: "Adicionais",
      minimo: 0,
      maximo: 2,
      opcoes: [
        { id: "queijo", nome: "Queijo", acrescimo: 3 },
        { id: "bacon", nome: "Bacon", acrescimo: 5 },
      ],
    },
  ],
};
const escolha = [{ grupoId: "tamanho", opcaoId: "normal" }];
describe("personalizações por preparo", () => {
  it("mantém IDs dos campos das demonstrações estáveis entre servidor e cliente", () => {
    expect(siteDoModelo("nail-designer").formulario.campos).toEqual(
      siteDoModelo("nail-designer").formulario.campos,
    );
    expect(
      siteDoModelo("cardapio-hamburgueria").produtos.some((p) => p.personalizacoes?.length),
    ).toBe(true);
  });
  it("não adiciona produtos indisponíveis e tolera opções corrompidas no rascunho", () => {
    expect(adicionarLinha({}, { ...produtoTeste, disponivel: false }, escolha)).toEqual({});
    const restaurado = normalizarLinhas({
      burger: { quantidade: 1, observacao: "", escolhas: [null, ...escolha] as never },
    });
    expect(restaurado.burger.escolhas).toEqual(escolha);
  });
  it("calcula os adicionais por unidade em centavos", () =>
    expect(
      calcularPersonalizacao(produtoTeste, [
        { grupoId: "tamanho", opcaoId: "duplo" },
        { grupoId: "adicional", opcaoId: "queijo" },
      ]).preco,
    ).toBe(41));
  it("exige opções obrigatórias e rejeita excesso, duplicatas e IDs falsos", () => {
    for (const escolhas of [
      [],
      [{ grupoId: "falso", opcaoId: "x" }],
      [...escolha, ...escolha],
      [...escolha, { grupoId: "tamanho", opcaoId: "duplo" }],
    ])
      expect(calcularPersonalizacao(produtoTeste, escolhas).erro).not.toBe("");
  });
  it("separa observações e combina apenas preparos idênticos", () => {
    let carrinho = adicionarLinha({}, produtoTeste, escolha, "Sem cebola");
    carrinho = adicionarLinha(carrinho, produtoTeste, escolha, "Completo");
    carrinho = adicionarLinha(carrinho, produtoTeste, escolha, "Sem cebola");
    const itens = itensDoCarrinho(carrinho, [produtoTeste]);
    expect(itens).toHaveLength(2);
    expect(itens.map((i) => i.quantidade)).toEqual([2, 1]);
    expect(itens[0]?.observacao).toContain("Sem cebola");
    expect(itens[1]?.observacao).toContain("Completo");
  });
  it("soma o estoque de todos os preparos", () => {
    const carrinho = adicionarLinha({}, produtoTeste, escolha, "", 4);
    expect(adicionarLinha(carrinho, produtoTeste, escolha, "outro")).toBe(carrinho);
  });
  it("preserva rascunhos antigos", () => {
    const produto = { ...produtoTeste, personalizacoes: [] };
    const itens = itensDoCarrinho(
      normalizarLinhas({ burger: { quantidade: 2, observacao: "Sem sal" } }),
      [produto],
    );
    expect(itens[0]).toMatchObject({
      produtoId: "burger",
      quantidade: 2,
      observacao: "Sem sal",
      preco: 30,
    });
  });
});
describe("checkout em etapas e ações por negócio", () => {
  const site = siteDoModelo("cardapio-doceria");
  const itens = [{ produtoId: "a", nome: "Teste", preco: 30, quantidade: 1 }];
  const dados: CamposEntrega = {
    nome: "Cliente teste",
    whatsapp: "11999999999",
    endereco: "Rua Teste, 10",
    bairro: "Centro",
    mesa: "1",
    pessoas: "",
    horarioPreferido: "",
    complemento: "",
    referencia: "",
    observacao: "",
    troco: "",
  };
  it("zero é grátis; taxa explicitamente indefinida impede entrega", () => {
    expect(rotuloTaxa(site, "entrega")).toBe("Entrega grátis");
    const indefinida = { ...site, comercio: { ...site.comercio!, taxaEntregaDefinida: false } };
    expect(taxaConhecida(indefinida, "entrega")).toBe(false);
    expect(erroEtapaCheckout(0, indefinida, itens, "entrega", dados)).toContain("taxa");
    expect(erroEtapaCheckout(0, indefinida, itens, "retirada", dados)).toBe("");
  });
  it("valida os dados somente a partir da etapa correspondente", () => {
    expect(erroEtapaCheckout(0, site, itens, "entrega", { ...dados, nome: "" })).toBe("");
    expect(erroEtapaCheckout(1, site, itens, "entrega", { ...dados, nome: "" })).toContain("nome");
    expect(erroEtapaCheckout(2, site, itens, "entrega", dados)).toContain("pagamento");
    expect(erroEtapaCheckout(3, site, itens, "entrega", dados, "pix")).toBe("");
  });
  it("escolhe agenda interna ou orçamento conforme a configuração", () => {
    expect(acaoNegocio(siteDoModelo("nail-designer"))).toMatchObject({
      secao: "agenda",
      rotulo: "Escolher horário",
    });
    expect(acaoNegocio(siteDoModelo("fotografo"))).toMatchObject({
      secao: "formulario",
      rotulo: "Pedir orçamento",
    });
  });
});
