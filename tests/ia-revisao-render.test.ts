import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RevisaoIA } from "@/components/painel/RevisaoIA";
import type { PlanoIA } from "@/lib/nexa/ia-tipos";

const plano: PlanoIA = {
  descricao: "Doces artesanais feitos sob encomenda.",
  segmento: "alimentacao",
  secoes: ["apresentacao", "produtos", "cardapio", "rodape"],
  produtos: [
    { nome: "Bolo de limão", descricao: "Massa de limão com cobertura cítrica.", imagemIndice: 1 },
    { nome: "Caixa degustação", descricao: "Presente de boas-vindas.", preco: 0 },
  ],
  direcoes: [
    {
      nome: "Ateliê delicado",
      conceito: "Composição editorial com fotos em destaque.",
      layout: "editorial",
      fonte: "elegante",
      cores: { primaria: "#aa2255", fundo: "#fffafa", texto: "#221122" },
    },
    {
      nome: "Vitrine colorida",
      conceito: "Produtos como protagonistas em uma vitrine alegre.",
      layout: "colorido",
      fonte: "editorial",
      cores: { primaria: "#bb3355", fundo: "#fff5ee", texto: "#331122" },
    },
    {
      nome: "Essencial artesanal",
      conceito: "Hierarquia limpa com espaço para a identidade da marca.",
      layout: "minimalista",
      fonte: "moderna",
      cores: { primaria: "#885544", fundo: "#ffffff", texto: "#222222" },
    },
  ],
  recomendacoes: ["Confira os horários de retirada no editor."],
};

function renderizar(props: Partial<Parameters<typeof RevisaoIA>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(RevisaoIA, {
      plano,
      onAprovar: vi.fn(),
      onRegerar: vi.fn(),
      onCancelar: vi.fn(),
      onPrevia: vi.fn(),
      onAjustar: vi.fn(),
      ...props,
    }),
  );
}

describe("revisão da criação com IA", () => {
  it("mostra as três propostas visuais e deixa claro que a publicação depende de aprovação", () => {
    const html = renderizar();
    expect(html.match(/type="radio"/g)).toHaveLength(3);
    for (const direcao of plano.direcoes!) {
      expect(html).toContain(direcao.nome);
      expect(html).toContain(direcao.conceito);
      expect(html).toContain(direcao.cores.primaria);
    }
    expect(html).toContain("Nada é criado até você aprovar.");
    expect(html).toContain("Aprovar e criar");
    expect(html).toContain("Atualizar prévia com minhas edições");
    expect(html).toContain(
      "São sugestões para revisar no editor, não funções ativadas automaticamente.",
    );
  });

  it("avisa sobre preço ausente sem confundi-lo com um preço zero informado", () => {
    const html = renderizar();
    expect(html.match(/Sem preço informado:/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Preço do produto 1"');
    expect(html).toContain('aria-label="Preço do produto 2"');
    expect(html).toMatch(/aria-label="Preço do produto 2"[^>]*value="0"/);
  });

  it("oferece associação explícita de fotos sem atribuir automaticamente a primeira imagem", () => {
    const html = renderizar({
      fotos: ["https://example.test/primeira.jpg", "https://example.test/bolo.jpg"],
    });
    expect(html).toContain('src="https://example.test/bolo.jpg"');
    expect(html).not.toContain('src="https://example.test/primeira.jpg"');
    expect(html).toContain("Foto do produto 1");
    expect(html).toContain("Foto do produto 2");
    expect(html).toContain("Sem foto — escolher depois");
  });

  it("expõe escopos de refinamento e bloqueia os controles durante a geração", () => {
    const html = renderizar({ criando: true });
    expect(html).toContain('<fieldset disabled=""');
    expect(html).toContain("Somente visual");
    expect(html).toContain("Somente textos e SEO");
    expect(html).toContain("Somente produtos e serviços");
    expect(html).toContain("Toda a proposta");
    expect(html).toContain("Pedir ajuste à IA");
  });

  it("trata textos da IA como texto, sem executar marcação retornada pelo modelo", () => {
    const html = renderizar({
      plano: {
        ...plano,
        descricao: "<script>alert('não executar')</script>",
        recomendacoes: ["<img src=x onerror=alert(1)>"],
      },
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });
});
