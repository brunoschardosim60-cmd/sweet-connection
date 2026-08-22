import { describe, expect, it } from "vitest";
import { siteDoModelo } from "@/lib/nexa/demo-modelos";
import {
  dadosEstruturadosDaNexa,
  dadosEstruturadosDoSite,
  serializarJsonLd,
} from "@/lib/nexa/seo-estruturado";

describe("dados estruturados dos mini-sites", () => {
  it("inclui negócio, página e itens de cardápio em Schema.org", () => {
    const dados = dadosEstruturadosDoSite(siteDoModelo("cardapio-hamburgueria"), {
      cardapio: true,
    });
    const grafo = dados["@graph"] as Array<Record<string, unknown>>;
    expect(grafo.some((item) => item["@type"] === "Restaurant")).toBe(true);
    expect(grafo.some((item) => item["@type"] === "Menu")).toBe(true);
    expect(grafo.some((item) => item["@type"] === "Product")).toBe(true);
  });

  it("serializa JSON-LD sem permitir fechar a tag script por conteúdo editável", () => {
    const dados = dadosEstruturadosDoSite(siteDoModelo("restaurante-moderno"));
    const texto = serializarJsonLd({ ...dados, exemplo: "</script><script>alert(1)</script>" });
    expect(texto).not.toContain("</script>");
    expect(texto).toContain("\\u003c/script>");
  });

  it("descreve a Nexa como plataforma, site e planos", () => {
    const grafo = dadosEstruturadosDaNexa()["@graph"] as Array<Record<string, unknown>>;
    expect(grafo.some((item) => item["@type"] === "Organization")).toBe(true);
    expect(grafo.some((item) => item["@type"] === "SoftwareApplication")).toBe(true);
    expect(grafo.some((item) => item["@type"] === "FAQPage")).toBe(true);
  });
});
