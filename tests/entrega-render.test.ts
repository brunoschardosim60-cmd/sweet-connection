import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PainelCarrinho } from "@/components/minisite/CheckoutPedido";
import { ConfiguracaoEntrega } from "@/components/editor/ConfiguracaoEntrega";
import { siteDoModelo } from "@/lib/nexa/demo-modelos";
import { totaisCarrinho } from "@/lib/nexa/catalogo";

describe("endereço da entrega na interface", () => {
  it("renderiza cidade e UF na cotação, sem presumir a localização do visitante", () => {
    const site = siteDoModelo("cardapio-doceria");
    site.comercio = { ...site.comercio!, calculoEntrega: "distancia" };
    const itens = [{ produtoId: "teste", nome: "Produto", preco: 10, quantidade: 1 }];
    const html = renderToStaticMarkup(
      createElement(PainelCarrinho, {
        site,
        itens,
        totais: totaisCarrinho(itens, site, "entrega"),
        entrega: "entrega",
        setEntrega: vi.fn(),
        pagamento: undefined,
        setPagamento: vi.fn(),
        campos: {
          nome: "",
          whatsapp: "",
          horarioPreferido: "",
          mesa: "",
          pessoas: "",
          endereco: "",
          bairro: "",
          complemento: "",
          referencia: "",
          observacao: "",
          troco: "",
        },
        setCampos: vi.fn(),
        onAlterar: vi.fn(),
        pedidosAtivos: false,
        enviando: false,
        retorno: "",
        onEnviar: vi.fn(),
      }),
    );
    expect(html).toContain("Cidade da entrega");
    expect(html).toContain('value="SP"');
    expect(html).toContain("Seu endereço será enviado ao Google");
    expect(html).not.toContain("Ver rota no Google Maps");
  });
  it("oferece reaproveitar o endereço da loja apenas quando cadastrado", () => {
    const valor = {
      ...siteDoModelo("cardapio-doceria").comercio!,
      calculoEntrega: "distancia" as const,
    };
    const props = { valor, alterar: vi.fn() };
    const semEndereco = renderToStaticMarkup(createElement(ConfiguracaoEntrega, props));
    const comEndereco = renderToStaticMarkup(
      createElement(ConfiguracaoEntrega, {
        ...props,
        enderecoLoja: "Praça da Sé, 1, São Paulo, SP",
      }),
    );
    expect(semEndereco).not.toContain("Usar endereço cadastrado da loja");
    expect(comEndereco).toContain("Usar endereço cadastrado da loja");
    expect(comEndereco).toContain("A localização não é detectada automaticamente");
  });
});
