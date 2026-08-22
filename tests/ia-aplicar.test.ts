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

  it("mantém mídia classificada em capa, produtos, equipe e vídeos", () => {
    const outro = aplicarPlanoIA(
      base,
      {
        descricao: "x",
        segmento: "beleza",
        produtos: [{ nome: "Pomada", descricao: "Fixação", categoria: "Produtos" }],
      },
      [],
      { estilo: "automatico", tema: "automatico" },
      "https://cdn.test/logo.jpg",
      {
        capa: "https://cdn.test/capa-escolhida.jpg",
        produtos: ["https://cdn.test/pomada.jpg"],
        galeria: ["https://cdn.test/ambiente.jpg"],
        equipe: [{ id: "e1", nome: "João", funcao: "Barbeiro", foto: "https://cdn.test/joao.jpg" }],
        videos: [{ id: "v1", titulo: "Conheça o espaço", url: "https://cdn.test/visita.mp4" }],
      },
    );
    expect(outro.conteudo.logo).toBe("https://cdn.test/logo.jpg");
    expect(outro.conteudo.capa).toBe("https://cdn.test/capa-escolhida.jpg");
    expect(outro.produtos[0]?.imagem).toBe("https://cdn.test/pomada.jpg");
    expect(outro.galeria[0]?.url).toBe("https://cdn.test/ambiente.jpg");
    expect(outro.equipe[0]?.nome).toBe("João");
    expect(outro.videos?.[0]?.titulo).toBe("Conheça o espaço");
    expect(outro.secoes.find((s) => s.tipo === "equipe")?.ativa).toBe(true);
    expect(outro.secoes.find((s) => s.tipo === "videos")?.ativa).toBe(true);
  });

  it("ativa o cardápio para alimentação quando a IA devolve produtos categorizados", () => {
    const restaurante = criarSite(
      { ...cliente, empresa: "Forno Alto", segmento: "alimentacao" },
      "personalizado",
      "forno-alto",
    );
    const resultado = aplicarPlanoIA(restaurante, {
      descricao: "Pizzaria de fermentação lenta.",
      segmento: "alimentacao",
      produtos: [{ nome: "Margherita", descricao: "Tomate e manjericão", categoria: "Pizzas" }],
    });
    expect(resultado.secoes.find((s) => s.tipo === "cardapio")?.ativa).toBe(true);
    expect(resultado.produtos[0]?.categoria).toBe("Pizzas");
  });
});

describe("preferências de estilo e paleta", () => {
  const base = criarSite(cliente, "barbearia-premium", "barbearia-nova");
  const plano = { descricao: "x", segmento: "beleza", modeloId: "barbearia-premium" } as const;

  it("aplica tema escolhido e ajustes do estilo", () => {
    const site = aplicarPlanoIA(base, { ...plano, tema: "claro" }, [], {
      estilo: "elegante",
      tema: "escuro",
    });
    expect(site.aparencia.tema).toBe("escuro");
    expect(site.aparencia.fonte).toBe("elegante");
  });

  it("mantém a identidade quando tudo é automático", () => {
    const site = aplicarPlanoIA(base, plano, [], { estilo: "automatico", tema: "automatico" });
    expect(site.aparencia.fonte).toBe(base.aparencia.fonte);
    expect(site.aparencia.tema).toBe(base.aparencia.tema);
  });
});
