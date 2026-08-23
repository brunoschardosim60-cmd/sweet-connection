import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calcularPrevia, dimensoesDispositivo } from "@/lib/nexa/previa";

const arquivos = {
  catalogo: "src/components/minisite/CatalogoPagina.tsx",
  minisite: "src/components/minisite/MiniSite.tsx",
};

const ler = (caminho: string) => readFileSync(caminho, "utf8");

/**
 * Dentro da moldura de celular/tablet o conteúdo é renderizado em 390/834px,
 * mas os breakpoints `sm:`/`md:`/`lg:` do Tailwind leem a largura da JANELA.
 * Em desktop isso ativava grades de 2 colunas dentro de um celular e quebrava
 * o layout. A regra: componentes de mini-site usam container queries.
 */
describe("responsividade do cardápio dentro da prévia", () => {
  for (const [nome, caminho] of Object.entries(arquivos)) {
    it(`${nome} não usa breakpoints de viewport`, () => {
      const fonte = ler(caminho);
      const proibidos = fonte.match(/(?<![\w@[-])(sm|md|lg|xl|2xl):/g) ?? [];
      expect(proibidos).toEqual([]);
    });
  }

  it("o catálogo declara um container de consulta na raiz", () => {
    expect(ler(arquivos.catalogo)).toContain("@container");
  });

  it("o catálogo tem estados de carregamento, vazio e sem resultado", () => {
    const fonte = ler(arquivos.catalogo);
    expect(fonte).toContain("Carregando itens…");
    expect(fonte).toContain("Cardápio em preparação");
    expect(fonte).toContain("Nenhum item encontrado");
    expect(fonte).toContain("catalogoVazio");
  });

  it("a moldura do celular rola o conteúdo sem cortar na horizontal", () => {
    const frame = ler("src/components/PhoneFrame.tsx");
    expect(frame).toContain("overflow-y-auto");
    expect(frame).toContain("overflow-x-hidden");
  });
});

/** Larguras de container onde a prévia precisa caber sem estourar. */
const larguras = [320, 360, 390, 430, 600, 768, 834, 1024, 1280, 1440];

describe("prévia do cardápio em várias larguras de container", () => {
  for (const dispositivo of ["celular", "tablet"] as const) {
    for (const largura of larguras) {
      it(`${dispositivo} cabe em ${largura}px de container`, () => {
        const caixa = calcularPrevia({ largura, altura: 640 }, dimensoesDispositivo[dispositivo]);
        expect(caixa.largura).toBeLessThanOrEqual(largura + 0.01);
        expect(caixa.altura).toBeLessThanOrEqual(640.01);
        expect(caixa.largura).toBeGreaterThan(0);
      });
    }
  }
});
