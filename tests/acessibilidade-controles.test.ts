import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NotaEstrelas } from "@/components/editor/NotaEstrelas";
import { destinoPorSecao } from "@/components/editor/PainelQualidade";
import { proximoIndiceBusca } from "@/lib/nexa/busca";
import type { TipoSecao } from "@/lib/nexa/types";

describe("navegação da busca global", () => {
  it("percorre os resultados para baixo e volta ao início", () => {
    expect(proximoIndiceBusca(-1, 3, "ArrowDown")).toBe(0);
    expect(proximoIndiceBusca(0, 3, "ArrowDown")).toBe(1);
    expect(proximoIndiceBusca(2, 3, "ArrowDown")).toBe(0);
  });

  it("percorre os resultados para cima e volta ao fim", () => {
    expect(proximoIndiceBusca(-1, 3, "ArrowUp")).toBe(2);
    expect(proximoIndiceBusca(2, 3, "ArrowUp")).toBe(1);
    expect(proximoIndiceBusca(0, 3, "ArrowUp")).toBe(2);
  });

  it("mantém nenhum resultado ativo quando a lista está vazia", () => {
    expect(proximoIndiceBusca(0, 0, "ArrowDown")).toBe(-1);
    expect(proximoIndiceBusca(0, 0, "ArrowUp")).toBe(-1);
  });
});

describe("nota acessível dos depoimentos", () => {
  it("renderiza cinco rádios nativos no mesmo grupo e marca a nota atual", () => {
    const html = renderToStaticMarkup(
      createElement(NotaEstrelas, {
        nota: 3,
        nomeGrupo: "nota-depoimento-d1",
        onChange: vi.fn(),
      }),
    );

    expect(html.match(/type="radio"/g)).toHaveLength(5);
    expect(html.match(/name="nota-depoimento-d1"/g)).toHaveLength(5);
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="3 estrelas"');
    expect(html).toMatch(/checked="" value="3"|value="3" checked=""/);
  });
});

describe("atalhos das seções para o editor", () => {
  it("direciona todos os tipos para uma aba e um bloco existentes", () => {
    const tipos: TipoSecao[] = [
      "apresentacao",
      "links",
      "produtos",
      "promocao",
      "cupom",
      "formulario",
      "localizacao",
      "horarios",
      "rodape",
      "servicos",
      "cardapio",
      "galeria",
      "videos",
      "depoimentos",
      "equipe",
      "faq",
    ];

    expect(Object.keys(destinoPorSecao).sort()).toEqual([...tipos, "livre"].sort());
    expect(destinoPorSecao.livre).toEqual({ aba: "secoes", bloco: "bloco-secoes" });
    for (const tipo of tipos) {
      expect(["conteudo", "itens"]).toContain(destinoPorSecao[tipo].aba);
      expect(destinoPorSecao[tipo].bloco).toMatch(/^bloco-/);
    }
  });

  it("abre os editores de coleções na aba Itens", () => {
    const tiposDeItens: TipoSecao[] = [
      "links",
      "produtos",
      "promocao",
      "cupom",
      "formulario",
      "servicos",
      "cardapio",
      "galeria",
      "videos",
      "depoimentos",
      "equipe",
      "faq",
    ];

    for (const tipo of tiposDeItens) expect(destinoPorSecao[tipo].aba).toBe("itens");
  });
});
