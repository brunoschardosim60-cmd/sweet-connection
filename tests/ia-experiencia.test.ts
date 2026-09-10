import { describe, expect, it } from "vitest";
import { criarSite } from "@/lib/nexa/factory";
import { aplicarPlanoIA } from "@/lib/nexa/ia-aplicar";
import { aplicarAjusteIA, validarPlanoIA } from "@/lib/nexa/ia-experiencia";
import type { PlanoIA } from "@/lib/nexa/ia-tipos";

const cliente = {
  empresa: "Doce do Bairro",
  segmento: "alimentacao" as const,
  responsavel: "Ana",
  telefone: "11999999999",
  email: "ana@example.com",
  cidade: "São Paulo",
  estado: "SP",
};

const planoAnterior: PlanoIA = {
  descricao: "Bolos artesanais por encomenda.",
  segmento: "alimentacao",
  layout: "editorial",
  fonte: "elegante",
  cores: { primaria: "#CC4477", fundo: "#FFFAFA", texto: "#332233" },
  tema: "claro",
  cta: "Encomendar meu bolo",
  secoes: ["apresentacao", "produtos", "faq", "formulario", "rodape"],
  produtos: [{ nome: "Bolo de cenoura", descricao: "Cobertura de chocolate", preco: 45 }],
  servicos: [{ nome: "Mesa de doces", descricao: "Montagem de eventos", preco: 300 }],
  faq: [{ pergunta: "Como encomendar?", resposta: "Entre em contato pelo WhatsApp." }],
  seo: { titulo: "Doce do Bairro", descricao: "Bolos em São Paulo" },
  formulario: { tipo: "orcamento", titulo: "Peça um orçamento" },
};

const planoGerado: PlanoIA = {
  descricao: "Uma nova descrição para o negócio.",
  segmento: "servicos",
  layout: "imersivo",
  fonte: "moderna",
  cores: { primaria: "#77CC44", fundo: "#112211", texto: "#FFFFFF" },
  tema: "escuro",
  cta: "Falar com a equipe",
  secoes: ["apresentacao", "servicos", "rodape"],
  produtos: [{ nome: "Outro bolo", descricao: "Outro sabor", preco: 55 }],
  servicos: [{ nome: "Entrega especial", descricao: "Serviço confirmado", preco: 20 }],
  faq: [{ pergunta: "Pergunta nova?", resposta: "Resposta nova." }],
  seo: { titulo: "Título novo", descricao: "Descrição nova" },
  formulario: { tipo: "contato", titulo: "Outro formulário" },
  direcoes: [
    {
      nome: "Natureza contemporânea",
      conceito: "Cores verdes e composição arejada.",
      layout: "imersivo",
      fonte: "moderna",
      cores: { primaria: "#77CC44", fundo: "#112211", texto: "#FFFFFF" },
    },
  ],
};

describe("validação do plano personalizado por IA", () => {
  it("aceita identidade, CTA, ordem e direções compatíveis com o renderizador", () => {
    expect(validarPlanoIA(planoGerado)).toEqual(planoGerado);
  });

  it.each(["inventado", "javascript:alert(1)", "", 42])("rejeita layout inválido: %s", (layout) => {
    expect(() => validarPlanoIA({ ...planoAnterior, layout })).toThrow();
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, 10000001, "45"])(
    "rejeita preço inválido sem convertê-lo em produto gratuito: %s",
    (preco) => {
      expect(() =>
        validarPlanoIA({
          ...planoAnterior,
          produtos: [{ nome: "Bolo", descricao: "Cenoura", preco }],
        }),
      ).toThrow();
      expect(() =>
        validarPlanoIA({
          ...planoAnterior,
          servicos: [{ nome: "Montagem", descricao: "Mesa de doces", preco }],
        }),
      ).toThrow();
    },
  );

  it("remove depoimentos e outros campos não confiáveis da resposta do provedor", () => {
    const plano = validarPlanoIA({
      ...planoAnterior,
      depoimentos: [{ nome: "Cliente inventado", nota: 5, comentario: "Nunca comprei aqui." }],
      integracoes: { pagamentoConfirmado: true },
      ownerId: "outro-usuario",
    });
    expect(plano).not.toHaveProperty("depoimentos");
    expect(plano).not.toHaveProperty("integracoes");
    expect(plano).not.toHaveProperty("ownerId");
    const site = aplicarPlanoIA(criarSite(cliente, "personalizado", "doce-bairro"), plano);
    expect(site.depoimentos).toEqual([]);
  });

  it("aceita até 20 produtos e serviços, mas rejeita listas acima do limite", () => {
    const itens = Array.from({ length: 20 }, (_, i) => ({
      nome: `Item ${i + 1}`,
      descricao: `Descrição ${i + 1}`,
      preco: i + 1,
    }));
    const plano = validarPlanoIA({ ...planoAnterior, produtos: itens, servicos: itens });
    expect(plano.produtos).toHaveLength(20);
    expect(plano.servicos).toHaveLength(20);
    expect(() => validarPlanoIA({ ...planoAnterior, produtos: [...itens, itens[0]] })).toThrow();
    expect(() => validarPlanoIA({ ...planoAnterior, servicos: [...itens, itens[0]] })).toThrow();
  });

  it.each([-1, 20, 1.5])("rejeita índice de foto inválido: %s", (imagemIndice) => {
    expect(() =>
      validarPlanoIA({
        ...planoAnterior,
        produtos: [{ nome: "Bolo", descricao: "Cenoura", imagemIndice }],
      }),
    ).toThrow();
  });
});

describe("ajustes por conversa respeitam o escopo escolhido", () => {
  it("ajuste visual preserva conteúdo, itens, identidade do negócio e ordem", () => {
    const anterior = structuredClone(planoAnterior);
    const resultado = aplicarAjusteIA(anterior, planoGerado, "visual");
    expect(resultado).toEqual({
      ...planoAnterior,
      cores: planoGerado.cores,
      tema: planoGerado.tema,
      layout: planoGerado.layout,
      fonte: planoGerado.fonte,
      direcoes: planoGerado.direcoes,
    });
    expect(anterior).toEqual(planoAnterior);
  });

  it("ajuste de textos não altera preços, fotos, formulário ou aparência", () => {
    expect(aplicarAjusteIA(planoAnterior, planoGerado, "textos")).toEqual({
      ...planoAnterior,
      descricao: planoGerado.descricao,
      cta: planoGerado.cta,
      faq: planoGerado.faq,
      seo: planoGerado.seo,
    });
  });

  it("ajuste dos itens não altera a composição nem os outros textos", () => {
    expect(aplicarAjusteIA(planoAnterior, planoGerado, "itens")).toEqual({
      ...planoAnterior,
      produtos: planoGerado.produtos,
      servicos: planoGerado.servicos,
    });
  });

  it("campos omitidos não apagam valores anteriores em ajustes parciais", () => {
    const gerado = { descricao: "Texto novo", segmento: "servicos" } as const;
    expect(aplicarAjusteIA(planoAnterior, gerado, "visual")).toEqual(planoAnterior);
    expect(aplicarAjusteIA(planoAnterior, gerado, "itens")).toEqual(planoAnterior);
    expect(aplicarAjusteIA(planoAnterior, gerado, "textos")).toEqual({
      ...planoAnterior,
      descricao: gerado.descricao,
    });
  });

  it("somente o ajuste completo substitui o plano inteiro", () => {
    expect(aplicarAjusteIA(planoAnterior, planoGerado, "completo")).toEqual(planoGerado);
  });
});

describe("aplicação da experiência específica do negócio", () => {
  it("aplica layout, fonte, CTA e ordem de seções sem alterar contatos", () => {
    const base = criarSite(cliente, "personalizado", "doce-bairro");
    const snapshot = structuredClone(base);
    const site = aplicarPlanoIA(base, planoAnterior);
    expect(site.aparencia.layout).toBe("editorial");
    expect(site.aparencia.fonte).toBe("elegante");
    expect(site.aparencia.corPrimaria).toBe("#CC4477");
    expect(site.links.find((link) => link.tipo === "whatsapp")?.titulo).toBe("Encomendar meu bolo");
    expect(site.links.find((link) => link.tipo === "whatsapp")?.valor).toBe(
      base.links.find((link) => link.tipo === "whatsapp")?.valor,
    );
    expect(site.secoes.slice(0, planoAnterior.secoes!.length).map((secao) => secao.tipo)).toEqual(
      planoAnterior.secoes,
    );
    expect(site.secoes.find((secao) => secao.tipo === "produtos")?.ativa).toBe(true);
    expect(site.secoes.find((secao) => secao.tipo === "cardapio")?.ativa).toBe(true);
    expect(base).toEqual(snapshot);
  });

  it("usa somente a associação confirmada e não distribui fotos pela posição", () => {
    const base = criarSite(cliente, "personalizado", "doce-bairro");
    const site = aplicarPlanoIA(
      base,
      {
        ...planoAnterior,
        produtos: [
          { nome: "Morango", descricao: "Fruta", preco: 20, imagemIndice: 1 },
          { nome: "Chocolate", descricao: "Cacau", preco: 25, imagemIndice: 0 },
          { nome: "Sem foto", descricao: "Não identificado", preco: 30 },
          { nome: "Foto inexistente", descricao: "A confirmar", preco: 35, imagemIndice: 19 },
        ],
        servicos: [{ nome: "Mesa de doces", descricao: "Montagem", imagemIndice: 1 }],
      },
      [],
      undefined,
      "https://cdn.test/logo.jpg",
      {
        associacaoExplicita: true,
        capa: "https://cdn.test/capa.jpg",
        produtos: ["https://cdn.test/chocolate.jpg", "https://cdn.test/morango.jpg"],
        galeria: ["https://cdn.test/loja.jpg"],
      },
    );
    expect(site.conteudo.logo).toBe("https://cdn.test/logo.jpg");
    expect(site.conteudo.capa).toBe("https://cdn.test/capa.jpg");
    expect(site.produtos.map((produto) => produto.imagem)).toEqual([
      "https://cdn.test/morango.jpg",
      "https://cdn.test/chocolate.jpg",
      undefined,
      undefined,
    ]);
    expect(site.servicos[0].imagem).toBe("https://cdn.test/morango.jpg");
    expect(site.galeria.map((foto) => foto.url)).toEqual(["https://cdn.test/loja.jpg"]);
  });

  it("não transforma imagens sem associação em galeria automática", () => {
    const site = aplicarPlanoIA(
      criarSite(cliente, "personalizado", "doce-bairro"),
      {
        ...planoAnterior,
        produtos: [{ nome: "Bolo", descricao: "Preço a confirmar" }],
        servicos: [],
      },
      [],
      undefined,
      undefined,
      {
        associacaoExplicita: true,
        produtos: ["https://cdn.test/sem-associacao.jpg"],
      },
    );
    expect(site.produtos[0]).not.toHaveProperty("imagem");
    expect(site.galeria).toEqual([]);
  });

  it("produto sem preço fica indisponível; zero informado explicitamente continua válido", () => {
    const plano = validarPlanoIA({
      ...planoAnterior,
      produtos: [
        { nome: "Preço a confirmar", descricao: "Sem valor fornecido" },
        { nome: "Amostra gratuita", descricao: "Grátis confirmado pelo negócio", preco: 0 },
        { nome: "Bolo", descricao: "Preço fornecido", preco: 45.9 },
      ],
    });
    const site = aplicarPlanoIA(criarSite(cliente, "personalizado", "doce-bairro"), plano);
    expect(site.produtos.map(({ preco, disponivel }) => ({ preco, disponivel }))).toEqual([
      { preco: 0, disponivel: false },
      { preco: 0, disponivel: true },
      { preco: 45.9, disponivel: true },
    ]);
  });

  it("aplica 20 produtos e serviços completos sem o antigo corte em oito", () => {
    const itens = Array.from({ length: 20 }, (_, i) => ({
      nome: `Item ${i + 1}`,
      descricao: `Descrição ${i + 1}`,
      preco: i + 1,
    }));
    const site = aplicarPlanoIA(criarSite(cliente, "personalizado", "doce-bairro"), {
      ...planoAnterior,
      produtos: itens,
      servicos: itens,
    });
    expect(site.produtos).toHaveLength(20);
    expect(site.servicos).toHaveLength(20);
    expect(site.produtos[19].nome).toBe("Item 20");
    expect(site.servicos[19].nome).toBe("Item 20");
    expect(new Set([...site.produtos, ...site.servicos].map((item) => item.id)).size).toBe(40);
  });

  it("formulário de agendamento recebe o campo de data que realmente suporta", () => {
    const base = criarSite(cliente, "personalizado", "doce-bairro");
    const site = aplicarPlanoIA(base, {
      ...planoAnterior,
      formulario: { tipo: "agendamento", titulo: "Agende sua visita" },
    });
    expect(site.formulario.tipo).toBe("agendamento");
    expect(site.formulario.titulo).toBe("Agende sua visita");
    expect(site.formulario.campos.some((campo) => campo.tipo === "data")).toBe(true);
  });
});
