import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MiniSite } from "@/components/minisite/MiniSite";
import { siteDoModelo } from "@/lib/nexa/demo-modelos";

describe("interações externas da demonstração", () => {
  const site = siteDoModelo("restaurante-moderno");

  it("remove destinos externos da demonstração", () => {
    const html = renderToStaticMarkup(
      createElement(MiniSite, { site, interacoesExternas: false, botaoFlutuante: false }),
    );

    expect(html).not.toContain('href="https://wa.me/');
    expect(html).not.toContain('href="https://www.google.com/maps/');
    expect(html).not.toContain('target="_blank"');
    expect(html).toContain('aria-disabled="true"');
  });

  it("mantém os destinos externos no mini-site real", () => {
    const html = renderToStaticMarkup(createElement(MiniSite, { site, botaoFlutuante: false }));

    expect(html).toContain('href="https://wa.me/');
    expect(html).toContain('href="https://www.google.com/maps/');
    expect(html).toContain('target="_blank"');
  });
});

describe("seções na prévia do editor", () => {
  it("mostra um marcador apenas no editor quando a seção ativa está vazia", () => {
    const site = siteDoModelo("restaurante-moderno");
    site.produtos = [];
    site.secoes = site.secoes.map((secao) => ({
      ...secao,
      ativa: secao.tipo === "produtos" || secao.tipo === "cardapio",
    }));

    const editor = renderToStaticMarkup(
      createElement(MiniSite, { site, botaoFlutuante: false, modoEdicao: true }),
    );
    const publico = renderToStaticMarkup(createElement(MiniSite, { site, botaoFlutuante: false }));

    expect(editor).toContain("Seção ativa. Adicione conteúdo na aba Itens.");
    expect(publico).not.toContain("Seção ativa. Adicione conteúdo na aba Itens.");
  });

  it("respeita o liga/desliga da apresentação", () => {
    const site = siteDoModelo("restaurante-moderno");
    site.secoes = site.secoes.map((secao) =>
      secao.tipo === "apresentacao" ? { ...secao, ativa: false } : secao,
    );

    const html = renderToStaticMarkup(createElement(MiniSite, { site, botaoFlutuante: false }));

    expect(html).not.toContain("<header");
  });

  it("exibe o título configurado em Links rápidos", () => {
    const site = siteDoModelo("restaurante-moderno");
    site.secoes = site.secoes.map((secao) =>
      secao.tipo === "links" ? { ...secao, ativa: true, titulo: "Fale com a gente" } : secao,
    );

    const html = renderToStaticMarkup(createElement(MiniSite, { site, botaoFlutuante: false }));

    expect(html).toContain("Fale com a gente");
  });
});
