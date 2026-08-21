import { describe, expect, it } from "vitest";
import { grupoDeSecao, secaoTemConteudo, secoesSemDuplicadas } from "@/lib/nexa/secoes";
import { modelos } from "@/lib/nexa/modelos";
import { siteDoModelo } from "@/lib/nexa/demo-modelos";
import { extrasPorModelo } from "@/lib/nexa/demo-extras";

const tipos = (secoes: { tipo: string }[]) => secoes.map((s) => s.tipo);

describe("deduplicação de seções do mini-site", () => {
  it("cardápio e produtos pertencem ao mesmo grupo visual", () => {
    expect(grupoDeSecao("cardapio")).toBe(grupoDeSecao("produtos"));
  });

  it("mantém apenas o primeiro bloco entre cardápio e produtos", () => {
    const saida = secoesSemDuplicadas([
      { tipo: "cardapio" },
      { tipo: "produtos" },
      { tipo: "contato" },
    ]);
    expect(tipos(saida)).toEqual(["cardapio", "contato"]);
  });

  it("mantém apenas o primeiro bloco entre promoção e cupom", () => {
    const saida = secoesSemDuplicadas([
      { tipo: "promocao" },
      { tipo: "cupom" },
      { tipo: "depoimentos" },
    ]);
    expect(tipos(saida)).toEqual(["promocao", "depoimentos"]);
  });

  it("não remove seções de tipos diferentes", () => {
    const entrada = [{ tipo: "servicos" }, { tipo: "galeria" }, { tipo: "faq" }];
    expect(tipos(secoesSemDuplicadas(entrada))).toEqual(tipos(entrada));
  });

  it("nenhum modelo exibe cardápio/produtos ou promoção/cupom duplicados", () => {
    for (const m of modelos) {
      const ativas = siteDoModelo(m.id).secoes.filter((s) => s.ativa);
      const grupos = secoesSemDuplicadas(ativas).map((s) => grupoDeSecao(s.tipo));
      expect(new Set(grupos).size, `modelo ${m.id}`).toBe(grupos.length);
    }
  });
});

describe("conteúdo complementar dos modelos", () => {
  it("existem 31 modelos publicados", () => {
    expect(modelos.length).toBe(31);
  });

  it("todo modelo demonstrativo tem CTA, formulário, depoimentos e FAQ", () => {
    for (const m of modelos) {
      const site = siteDoModelo(m.id);
      const principal = site.links[0]?.titulo ?? "";
      expect(principal.trim().length, `cta ${m.id}`).toBeGreaterThan(0);
      expect(site.formulario.campos.length, `formulário ${m.id}`).toBeGreaterThan(0);
      expect(site.depoimentos.length, `depoimentos ${m.id}`).toBeGreaterThan(0);
      expect(site.faq.length, `faq ${m.id}`).toBeGreaterThan(0);
    }
  });

  it("os extras identificam depoimentos como demonstração", () => {
    for (const [id, extras] of Object.entries(extrasPorModelo)) {
      for (const d of extras.depoimentos ?? []) {
        expect(d.nome, `depoimento ${id}`).toContain("demonstração");
        expect(d.nota).toBeGreaterThanOrEqual(1);
        expect(d.nota).toBeLessThanOrEqual(5);
      }
    }
  });

  it("cada modelo tem nome e destaque próprios", () => {
    const nomes = new Set(modelos.map((m) => m.nome));
    expect(nomes.size).toBe(modelos.length);
  });
});

describe("conteúdo visível das seções", () => {
  it("considera vazias as seções de itens sem registros", () => {
    const site = siteDoModelo(modelos[0]!.id);
    site.produtos = [];
    site.servicos = [];
    site.galeria = [];
    site.videos = [];
    site.depoimentos = [];
    site.equipe = [];
    site.cupons = [];
    site.faq = [];
    site.links = [];
    site.formulario.campos = [];

    for (const tipo of [
      "links",
      "produtos",
      "cardapio",
      "servicos",
      "galeria",
      "videos",
      "depoimentos",
      "equipe",
      "promocao",
      "cupom",
      "faq",
      "formulario",
    ]) {
      expect(secaoTemConteudo(site, tipo), tipo).toBe(false);
    }
  });

  it("mantém apresentação, localização, horários e rodapé visíveis sem listas", () => {
    const site = siteDoModelo(modelos[0]!.id);
    for (const tipo of ["apresentacao", "localizacao", "horarios", "rodape"]) {
      expect(secaoTemConteudo(site, tipo), tipo).toBe(true);
    }
  });

  it("ignora links e cupons desativados", () => {
    const site = siteDoModelo(modelos[0]!.id);
    site.links = site.links.map((item) => ({ ...item, ativo: false }));
    site.cupons = site.cupons.map((item) => ({ ...item, ativo: false }));

    expect(secaoTemConteudo(site, "links")).toBe(false);
    expect(secaoTemConteudo(site, "cupom")).toBe(false);
  });
});
