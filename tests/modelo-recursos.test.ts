import { describe, expect, it } from "vitest";
import { recursosDoModelo } from "@/lib/nexa/modelo-recursos";
import { modelos } from "@/lib/nexa/modelos";

describe("recursos apresentados na galeria de modelos", () => {
  it("atribui exatamente três recursos, sem repetições, a cada modelo", () => {
    for (const modelo of modelos) {
      const recursos = recursosDoModelo(modelo);
      expect(recursos, modelo.id).toHaveLength(3);
      expect(new Set(recursos).size, modelo.id).toBe(3);
    }
  });

  it("destaca catálogo, carrinho e pedidos para todo cardápio digital", () => {
    for (const modelo of modelos.filter((item) => item.familia === "cardapio")) {
      expect(recursosDoModelo(modelo), modelo.id).toEqual(["catalogo", "carrinho", "pedidos"]);
    }
  });

  it("mantém recursos coerentes nos novos nichos", () => {
    expect(recursosDoModelo(modelos.find((m) => m.id === "psicologia-terapia")!)).toContain(
      "agenda",
    );
    expect(recursosDoModelo(modelos.find((m) => m.id === "turismo-passeios")!)).toContain(
      "reserva",
    );
    expect(recursosDoModelo(modelos.find((m) => m.id === "floricultura")!)).toContain("catalogo");
  });
});
