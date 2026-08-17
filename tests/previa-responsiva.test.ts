import { describe, expect, it } from "vitest";
import {
  calcularPrevia,
  dimensoesDispositivo,
  larguraCssPrevia,
  type Caixa,
} from "@/lib/nexa/previa";

/** Telas reais menos o cabeçalho e o respiro da área de prévia. */
const telas: Caixa[] = [
  { largura: 360, altura: 500 },
  { largura: 390, altura: 700 },
  { largura: 679, altura: 430 },
  { largura: 1024, altura: 400 },
  { largura: 1280, altura: 900 },
  { largura: 1920, altura: 1080 },
];

describe("prévia responsiva dos modelos", () => {
  for (const nome of ["celular", "tablet"] as const) {
    const disp = dimensoesDispositivo[nome];
    describe(nome, () => {
      for (const tela of telas) {
        it(`cabe inteira em ${tela.largura}x${tela.altura}`, () => {
          const caixa = calcularPrevia(tela, disp);
          expect(caixa.largura).toBeLessThanOrEqual(tela.largura + 0.01);
          expect(caixa.altura).toBeLessThanOrEqual(tela.altura + 0.01);
          expect(caixa.largura).toBeGreaterThan(0);
        });

        it(`mantém a proporção em ${tela.largura}x${tela.altura}`, () => {
          const caixa = calcularPrevia(tela, disp);
          expect(caixa.largura / caixa.altura).toBeCloseTo(disp.largura / disp.altura, 5);
        });
      }

      it("nunca ultrapassa o tamanho nominal do dispositivo", () => {
        const caixa = calcularPrevia({ largura: 4000, altura: 4000 }, disp);
        expect(caixa.largura).toBeLessThanOrEqual(disp.largura);
        expect(caixa.altura).toBeLessThanOrEqual(disp.altura);
      });

      it("gera CSS limitado por largura, altura do container e tamanho nominal", () => {
        const css = larguraCssPrevia(disp);
        expect(css).toContain("min(100%");
        expect(css).toContain(`${disp.largura}px`);
        expect(css).toContain("100cqh");
      });
    });
  }
});
