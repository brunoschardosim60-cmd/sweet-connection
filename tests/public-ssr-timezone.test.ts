import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi, afterEach } from "vitest";
import { CatalogoPagina } from "@/components/minisite/CatalogoPagina";
import { MiniSite } from "@/components/minisite/MiniSite";
import { siteDoModelo } from "@/lib/nexa/demo-modelos";

afterEach(() => vi.restoreAllMocks());
describe("primeiro HTML público independente do fuso", () => {
  it("não calcula o horário do estabelecimento antes da hidratação", () => {
    vi.spyOn(Date.prototype, "getDay").mockImplementation(() => {
      throw new Error("horário antes da hidratação");
    });
    const html = renderToString(
      createElement(CatalogoPagina, {
        site: siteDoModelo("cardapio-hamburgueria"),
        interacoesExternas: true,
      }),
    );
    expect(html).toContain("Horários de atendimento");
    expect(html).not.toContain("Abre hoje");
  });
  it("renderiza agenda com estado inicial estável em vez de datas locais", () => {
    vi.spyOn(Date.prototype, "getDay").mockImplementation(() => {
      throw new Error("dia antes da hidratação");
    });
    const html = renderToString(
      createElement(MiniSite, { site: siteDoModelo("nail-designer"), interacoesExternas: false }),
    );
    expect(html).toContain("Carregando horários");
  });
});
