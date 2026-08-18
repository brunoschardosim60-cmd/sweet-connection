import { describe, expect, it } from "vitest";
import { criarSite } from "@/lib/nexa/factory";
import { aplicarPlanoIA } from "@/lib/nexa/ia-aplicar";

const cliente = {
  empresa: "Barbearia Nova",
  segmento: "beleza" as const,
  responsavel: "João",
  telefone: "(11) 99999-9999",
  email: "contato@example.com",
  cidade: "São Paulo",
  estado: "SP",
};

describe("aplicarPlanoIA", () => {
  const base = criarSite(cliente, "barbearia-premium", "barbearia-nova");
  const site = aplicarPlanoIA(
    base,
    {
      descricao: "Barbearia moderna",
      segmento: "beleza",
      modeloId: "barbearia-premium",
      cores: { primaria: "#1A2B3C" },
      tema: "claro",
      secoes: ["apresentacao", "servicos", "galeria", "formulario", "rodape"],
      servicos: [{ nome: "Corte", descricao: "Corte masculino", duracao: "45 min", preco: 65 }],
      faq: [{ pergunta: "Aceita cartão?", resposta: "Sim." }],
      depoimentos: [{ nome: "Ana", nota: 5, comentario: "Ótimo" }],
      seo: { titulo: "Barbearia Nova", descricao: "Cortes em SP", palavras: "barbearia" },
    },
    ["https://cdn.test/capa.jpg", "https://cdn.test/1.jpg", "https://cdn.test/2.jpg"],
  );

  it("usa a primeira imagem como capa e o restante nos itens/galeria", () => {
    expect(site.conteudo.capa).toBe("https://cdn.test/capa.jpg");
    expect(site.servicos[0]?.imagem).toBe("https://cdn.test/1.jpg");
    expect(site.galeria.map((g) => g.url)).toEqual(["https://cdn.test/2.jpg"]);
  });

  it("aplica cores, conteúdo e seções sugeridas", () => {
    expect(site.aparencia.corPrimaria).toBe("#1A2B3C");
    expect(site.conteudo.descricao).toBe("Barbearia moderna");
    expect(site.faq).toHaveLength(1);
    expect(site.depoimentos[0]?.destaque).toBe(true);
    expect(site.secoes.find((s) => s.tipo === "servicos")?.ativa).toBe(true);
    expect(site.secoes.find((s) => s.tipo === "cupom")?.ativa).toBe(false);
  });

  it("ignora cores inválidas", () => {
    const outro = aplicarPlanoIA(base, {
      descricao: "x",
      segmento: "beleza",
      modeloId: "barbearia-premium",
      cores: { primaria: "azul" },
    });
    expect(outro.aparencia.corPrimaria).toBe(base.aparencia.corPrimaria);
  });
});
