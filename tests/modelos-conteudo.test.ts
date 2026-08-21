import { describe, expect, it } from "vitest";
import { modelos } from "@/lib/nexa/modelos";
import { siteDoModelo } from "@/lib/nexa/demo-modelos";
import { presetsModelo } from "@/lib/nexa/factory";

const novos = ["academia-studio", "tattoo-studio", "construcao-arquitetura", "pousada-hotel"];

describe("modelos e conteúdo demonstrativo", () => {
  it("inclui os quatro novos modelos com capa e paleta próprias", () => {
    for (const id of novos) {
      const modelo = modelos.find((m) => m.id === id);
      expect(modelo, id).toBeTruthy();
      expect(modelo!.imagem).toBeTruthy();
      expect(modelo!.paleta.primaria).toMatch(/^#/);
      expect(presetsModelo[id], `preset ${id}`).toBeTruthy();
    }
  });

  it("cada modelo tem preset de seções e formulário próprio", () => {
    for (const m of modelos) {
      const preset = presetsModelo[m.id];
      expect(preset, m.id).toBeTruthy();
      expect(preset!.secoes.length).toBeGreaterThan(4);
      expect(preset!.tituloFormulario.length).toBeGreaterThan(4);
    }
  });

  it("nenhuma demonstração ativa uma seção sem conteúdo", () => {
    for (const m of modelos) {
      const s = siteDoModelo(m.id);
      const vazias = s.secoes
        .filter((x) => x.ativa)
        .map((x) => x.tipo)
        .filter(
          (t) =>
            (t === "equipe" && !s.equipe.length) ||
            (t === "galeria" && !s.galeria.length) ||
            (t === "faq" && !s.faq.length) ||
            (t === "produtos" && !s.produtos.length) ||
            (t === "cardapio" && !s.produtos.length) ||
            (t === "servicos" && !s.servicos.length) ||
            (t === "depoimentos" && !s.depoimentos.length) ||
            (t === "cupom" && !s.cupons.length) ||
            (t === "videos" && !(s.videos ?? []).length),
        );
      expect(vazias, `${m.id}: ${vazias.join(",")}`).toHaveLength(0);
    }
  });

  it("depoimentos das demonstrações são rotulados como demonstração", () => {
    for (const id of novos) {
      const s = siteDoModelo(id);
      expect(s.depoimentos.length).toBeGreaterThan(0);
      for (const d of s.depoimentos) expect(d.nome.toLowerCase()).toContain("demonstração");
    }
  });

  it("cada demonstração tem formulário, FAQ e CTA coerentes", () => {
    for (const m of modelos) {
      const s = siteDoModelo(m.id);
      expect(s.formulario.campos.length, m.id).toBeGreaterThan(1);
      expect(s.faq.length, m.id).toBeGreaterThan(0);
      expect(s.links[0]?.titulo, m.id).toBeTruthy();
    }
  });
});
