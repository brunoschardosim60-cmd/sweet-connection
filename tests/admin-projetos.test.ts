import { beforeEach, describe, expect, it, vi } from "vitest";

/** Respostas controladas do cliente Supabase para cada tabela consultada. */
const respostas: Record<
  string,
  { data: unknown; error: { message: string; code?: string } | null }
> = {
  minisites: { data: [], error: null },
  form_submissions: { data: [], error: null },
};

vi.mock("@/integrations/supabase/client", () => {
  const consulta = (tabela: string) => {
    const resultado = respostas[tabela]!;
    const encadeavel: Record<string, unknown> = {
      then: (aceitar: (v: unknown) => unknown) => Promise.resolve(resultado).then(aceitar),
    };
    for (const metodo of ["select", "eq", "order", "in"]) {
      encadeavel[metodo] = () => encadeavel;
    }
    return encadeavel;
  };
  return { supabase: { from: (tabela: string) => consulta(tabela) } };
});

const { carregarProjetosUsuario, descreverEstadoProjetos, mapearProjetos, nomeDoProjeto } =
  await import("@/lib/nexa/admin");

const linha = (extra: Record<string, unknown> = {}) => ({
  id: "s1",
  slug: "padaria-lua",
  status: "publicado",
  created_at: "2026-01-01T10:00:00Z",
  updated_at: "2026-02-01T10:00:00Z",
  published_at: "2026-01-20T10:00:00Z",
  draft_content: { conteudo: { nome: "Padaria Lua Nova" } },
  published_content: { conteudo: { nome: "Padaria Lua" } },
  ...extra,
});

beforeEach(() => {
  respostas["minisites"] = { data: [], error: null };
  respostas["form_submissions"] = { data: [], error: null };
});

describe("nome do projeto no painel administrativo", () => {
  it("prioriza o rascunho, que é a versão mais recente", () => {
    expect(
      nomeDoProjeto(
        { conteudo: { nome: "Rascunho" } },
        { conteudo: { nome: "Publicado" } },
        "slug",
      ),
    ).toBe("Rascunho");
  });

  it("usa o publicado como alternativa quando o rascunho não tem nome", () => {
    expect(
      nomeDoProjeto({ conteudo: { nome: "  " } }, { conteudo: { nome: "Publicado" } }, "slug"),
    ).toBe("Publicado");
    expect(nomeDoProjeto(null, { cliente: { empresa: "Empresa" } }, "slug")).toBe("Empresa");
  });

  it("cai para o slug quando nenhum conteúdo tem nome", () => {
    expect(nomeDoProjeto(null, null, "meu-slug")).toBe("meu-slug");
  });
});

describe("mapeamento de projetos", () => {
  it("conta as solicitações reais de cada mini-site", () => {
    const projetos = mapearProjetos(
      [linha(), linha({ id: "s2", slug: "outro" })],
      [{ minisite_id: "s1" }, { minisite_id: "s1" }, { minisite_id: "s2" }],
    );
    expect(projetos[0]?.solicitacoes).toBe(2);
    expect(projetos[1]?.solicitacoes).toBe(1);
    expect(projetos[0]?.nome).toBe("Padaria Lua Nova");
  });

  it("mantém zero quando o site não recebeu solicitações", () => {
    expect(mapearProjetos([linha()], [])[0]?.solicitacoes).toBe(0);
  });
});

describe("leitura dos projetos do usuário", () => {
  it("retorna lista vazia quando a conta não tem mini-sites", async () => {
    await expect(carregarProjetosUsuario("u1")).resolves.toEqual([]);
  });

  it("retorna os projetos com contagem de solicitações", async () => {
    respostas["minisites"] = { data: [linha()], error: null };
    respostas["form_submissions"] = { data: [{ minisite_id: "s1" }], error: null };
    const projetos = await carregarProjetosUsuario("u1");
    expect(projetos).toHaveLength(1);
    expect(projetos[0]).toMatchObject({
      slug: "padaria-lua",
      nome: "Padaria Lua Nova",
      status: "publicado",
      solicitacoes: 1,
    });
  });

  it("propaga erro de permissão com mensagem em português", async () => {
    respostas["minisites"] = { data: null, error: { message: "negado", code: "42501" } };
    await expect(carregarProjetosUsuario("u1")).rejects.toThrow(
      "Esta conta não tem permissão de administrador.",
    );
  });

  it("propaga erro da consulta de solicitações", async () => {
    respostas["minisites"] = { data: [linha()], error: null };
    respostas["form_submissions"] = { data: null, error: { message: "falha de rede" } };
    await expect(carregarProjetosUsuario("u1")).rejects.toThrow("falha de rede");
  });
});

describe("estados da interface de projetos", () => {
  it("carregando tem prioridade sobre os demais", () => {
    expect(descreverEstadoProjetos({ carregando: true, erro: "x", itens: [] })).toBe("carregando");
  });

  it("erro aparece antes do estado vazio", () => {
    expect(descreverEstadoProjetos({ carregando: false, erro: "falhou", itens: [] })).toBe("erro");
  });

  it("lista vazia sem erro é estado vazio", () => {
    expect(descreverEstadoProjetos({ carregando: false, erro: null, itens: [] })).toBe("vazio");
  });

  it("com itens é estado de lista", () => {
    const itens = mapearProjetos([linha()], []);
    expect(descreverEstadoProjetos({ carregando: false, erro: null, itens })).toBe("lista");
  });
});
