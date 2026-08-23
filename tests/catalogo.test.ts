import { describe, expect, it } from "vitest";
import { criarSite } from "@/lib/nexa/factory";
import {
  descontoPercentual,
  enderecoCardapio,
  filtrarCatalogo,
  itensDestaque,
  mensagemPedido,
  normalizarCategoria,
  perfilCatalogo,
  totaisCarrinho,
  whatsappValido,
} from "@/lib/nexa/catalogo";
import { siteDoModelo } from "@/lib/nexa/demo-modelos";
import type { Produto } from "@/lib/nexa/types";

const cliente = {
  empresa: "Pizzaria Teste",
  segmento: "alimentacao" as const,
  responsavel: "Responsável",
  telefone: "(11) 99999-9999",
  email: "contato@example.com",
  cidade: "São Paulo",
  estado: "SP",
};

const produto = (over: Partial<Produto> & { id: string; nome: string }): Produto => ({
  descricao: "",
  preco: 30,
  categoria: "Pizzas",
  variacoes: [],
  disponivel: true,
  destaque: false,
  ...over,
});

describe("catálogo do mini-site", () => {
  it("reutiliza a categoria existente ignorando caixa e espaços", () => {
    expect(normalizarCategoria("  PIZZAS  ", ["Pizzas", "Bebidas"])).toBe("Pizzas");
    expect(normalizarCategoria("Sobremesas", ["Pizzas"])).toBe("Sobremesas");
  });
  const site = criarSite(cliente, "pizzaria", "pizzaria-teste");

  it("usa o rótulo de cardápio para alimentação", () => {
    expect(perfilCatalogo(site).rotulo).toBe("Cardápio");
    expect(enderecoCardapio(site.slug)).toBe(`/site/${site.slug}/cardapio`);
  });

  it("calcula desconto e prioriza destaques na seleção compacta", () => {
    const itens = [
      produto({ id: "a", nome: "Comum" }),
      produto({ id: "b", nome: "Promo", precoPromocional: 15 }),
      produto({ id: "c", nome: "Top", destaque: true }),
    ];
    expect(descontoPercentual(itens[1] as Produto)).toBe(50);
    expect(itensDestaque(itens, 2).map((p) => p.id)).toEqual(["c", "b"]);
  });

  it("filtra por busca, categoria e estado do item", () => {
    const itens = [
      produto({ id: "a", nome: "Margherita", categoria: "Pizzas" }),
      produto({ id: "b", nome: "Refrigerante", categoria: "Bebidas", disponivel: false }),
    ];
    expect(filtrarCatalogo(itens, { busca: "refri" }).map((p) => p.id)).toEqual(["b"]);
    expect(filtrarCatalogo(itens, { categoria: "Pizzas" }).map((p) => p.id)).toEqual(["a"]);
    expect(filtrarCatalogo(itens, { filtro: "disponiveis" }).map((p) => p.id)).toEqual(["a"]);
  });

  it("soma taxa de entrega apenas na entrega e monta a mensagem do pedido", () => {
    const comercio = { ...site, comercio: { carrinho: true, taxaEntrega: 8, pedidoMinimo: 20 } };
    const itens = [{ produtoId: "a", nome: "Margherita", preco: 30, quantidade: 1 }];
    expect(totaisCarrinho(itens, comercio, "retirada").total).toBe(30);
    expect(totaisCarrinho(itens, comercio, "entrega").total).toBe(38);

    const texto = mensagemPedido(comercio, itens, "entrega", {
      endereco: "Rua A, 10",
      pagamento: "dinheiro",
      troco: "R$ 50,00",
    });
    expect(texto).toContain("1x Margherita");
    expect(texto).toContain("Endereço: Rua A, 10");
    expect(texto).toContain("Troco para: R$ 50,00");
    expect(texto).not.toContain("Bairro:");
  });

  it("ativa carrinho nos modelos de demonstração do Cardápio Digital", () => {
    const site = siteDoModelo("cardapio-pizzaria");
    expect(site.comercio?.carrinho).toBe(true);
    expect(site.produtos.length).toBeGreaterThan(0);
  });

  it("aceita apenas números de WhatsApp brasileiros com DDD", () => {
    expect(whatsappValido("11999998888")).toBe(true);
    expect(whatsappValido("5511999998888")).toBe(true);
    expect(whatsappValido("1199999")).toBe(false);
    expect(whatsappValido("55119999998888")).toBe(false);
  });
});
