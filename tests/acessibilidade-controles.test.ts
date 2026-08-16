import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NotaEstrelas } from "@/components/editor/NotaEstrelas";
import { proximoIndiceBusca } from "@/lib/nexa/busca";

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
