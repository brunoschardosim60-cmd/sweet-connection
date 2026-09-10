import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const admin = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  rpc: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: admin }));

import { gerarPlano, type EntradaPlano } from "@/lib/nexa/ia.server";
import { validarSessaoIA } from "@/lib/nexa/ia-sessao.server";
import type { PlanoIA } from "@/lib/nexa/ia-tipos";

const usuario = "00000000-0000-4000-8000-000000000001";
const outroUsuario = "00000000-0000-4000-8000-000000000002";
const segredo = "segredo-falso-exclusivo-deste-teste-com-mais-de-32-caracteres";
const entrada: EntradaPlano = {
  empresa: "Doce do Bairro",
  nicho: "Doceria artesanal com bolos por encomenda",
};
const plano: PlanoIA = {
  descricao: "Bolos artesanais para compartilhar.",
  segmento: "alimentacao",
  layout: "editorial",
  fonte: "elegante",
  cores: { primaria: "#CC4488", fundo: "#FFFAFA", texto: "#332233" },
  produtos: [{ nome: "Bolo de cenoura", descricao: "Cobertura de chocolate", preco: 45 }],
};

const requisitar = vi.fn<typeof fetch>();
let permitirAjuste = true;
let perfil = {
  subscription_tier: "professional",
  subscription_status: "active",
  admin_suspended_at: null as string | null,
};

function respostaGemini(conteudo: unknown = plano) {
  return Response.json({
    candidates: [{ content: { parts: [{ text: JSON.stringify(conteudo) }] } }],
    usageMetadata: { promptTokenCount: 40, candidatesTokenCount: 60, totalTokenCount: 100 },
  });
}

function comAjuste(anterior: PlanoIA): EntradaPlano {
  return {
    ...entrada,
    ajuste: { pedido: "Deixe o visual mais contemporâneo", escopo: "visual", anterior },
  };
}

async function gerarInicialELimparChamadas() {
  const anterior = await gerarPlano(entrada, "token-auth-falso");
  requisitar.mockClear();
  admin.rpc.mockClear();
  admin.from.mockClear();
  admin.auth.getUser.mockClear();
  return anterior;
}

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "gemini-chave-falsa-sem-acesso-externo");
  vi.stubEnv("LOVABLE_API_KEY", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", segredo);
  vi.stubEnv("VITE_SUPABASE_URL", "https://teste-ia.supabase.co");
  vi.stubGlobal("fetch", requisitar);
  permitirAjuste = true;
  perfil = {
    subscription_tier: "professional",
    subscription_status: "active",
    admin_suspended_at: null,
  };
  admin.auth.getUser.mockResolvedValue({ data: { user: { id: usuario } }, error: null });
  admin.rpc.mockImplementation(async (nome: string) => ({
    data:
      nome === "nexa_consume_ai_generation"
        ? [{ allowed: true }]
        : nome === "nexa_limite_ajuste_ia"
          ? permitirAjuste
          : null,
    error: null,
  }));
  admin.from.mockImplementation((tabela: string) => {
    const consulta = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({
        data: tabela === "profiles" ? perfil : null,
        error: null,
      })),
    };
    return consulta;
  });
  requisitar.mockImplementation(async () => respostaGemini());
});

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("geração de IA autenticada e ajustes limitados no servidor", () => {
  it("rejeita entrada inválida antes de autenticar, consumir cota ou chamar provedor", async () => {
    await expect(gerarPlano({ ...entrada, nicho: "curto" }, "token-auth-falso")).rejects.toThrow();
    expect(admin.auth.getUser).not.toHaveBeenCalled();
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(requisitar).not.toHaveBeenCalled();
  });

  it("geração válida consome uma cota e emite credencial assinada para esse usuário e briefing", async () => {
    requisitar.mockImplementation(async () =>
      respostaGemini({ ...plano, sessaoAjustes: "credencial-inventada-pelo-provedor" }),
    );
    const resultado = await gerarPlano(entrada, "token-auth-falso");
    expect(admin.rpc).toHaveBeenCalledWith("nexa_consume_ai_generation", {
      requested_user_id: usuario,
    });
    expect(admin.rpc).not.toHaveBeenCalledWith("nexa_limite_ajuste_ia", expect.anything());
    expect(resultado.produtos).toEqual(plano.produtos);
    expect(resultado.sessaoAjustes).toEqual(expect.any(String));
    expect(resultado.sessaoAjustes).not.toBe("credencial-inventada-pelo-provedor");
    const hash = createHash("sha256").update(JSON.stringify(entrada)).digest("hex");
    expect(validarSessaoIA(resultado.sessaoAjustes!, usuario, hash, segredo)).toEqual({
      id: expect.any(String),
      expira: expect.any(Number),
    });
    expect(requisitar).toHaveBeenCalledTimes(1);
    expect(admin.rpc).toHaveBeenCalledWith(
      "nexa_record_ai_generation",
      expect.objectContaining({
        requested_user_id: usuario,
        requested_provider: "gemini",
        requested_total_tokens: 100,
      }),
    );
  });

  it("ajuste visual válido usa o limite de três tentativas, não a cota semanal, e preserva os produtos", async () => {
    const anterior = await gerarInicialELimparChamadas();
    requisitar.mockImplementation(async () =>
      respostaGemini({
        ...plano,
        descricao: "Texto que não deveria mudar",
        layout: "imersivo",
        fonte: "moderna",
        produtos: [{ nome: "Item indevido", descricao: "Fora do escopo", preco: 999 }],
      }),
    );
    const resultado = await gerarPlano(comAjuste(anterior), "token-auth-falso");
    expect(resultado.layout).toBe("imersivo");
    expect(resultado.fonte).toBe("moderna");
    expect(resultado.produtos).toEqual(anterior.produtos);
    expect(resultado.descricao).toBe(anterior.descricao);
    expect(resultado.sessaoAjustes).toBe(anterior.sessaoAjustes);
    expect(admin.rpc).toHaveBeenCalledWith("nexa_limite_ajuste_ia", {
      chave: expect.stringMatching(new RegExp(`^ia-ajuste:${usuario}:`)),
    });
    expect(admin.rpc).not.toHaveBeenCalledWith("nexa_consume_ai_generation", expect.anything());
    expect(admin.rpc).not.toHaveBeenCalledWith("nexa_refund_ai_generation", expect.anything());
    expect(requisitar).toHaveBeenCalledTimes(1);
  });

  it("credencial de outro usuário é bloqueada antes de consultar plano, limite ou provedor", async () => {
    const anterior = await gerarInicialELimparChamadas();
    admin.auth.getUser.mockResolvedValue({ data: { user: { id: outroUsuario } }, error: null });
    await expect(gerarPlano(comAjuste(anterior), "token-de-outra-conta")).rejects.toThrow(
      /sessão de ajustes/i,
    );
    expect(admin.from).not.toHaveBeenCalled();
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(requisitar).not.toHaveBeenCalled();
  });

  it("mudança de briefing não reutiliza os ajustes da criação anterior", async () => {
    const anterior = await gerarInicialELimparChamadas();
    await expect(
      gerarPlano(
        { ...comAjuste(anterior), nicho: "Oficina especializada em carros elétricos" },
        "token-auth-falso",
      ),
    ).rejects.toThrow(/briefing mudou/i);
    expect(admin.from).not.toHaveBeenCalled();
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(requisitar).not.toHaveBeenCalled();
  });

  it("esgotar as três tentativas bloqueia o provedor sem consumir geração semanal", async () => {
    const anterior = await gerarInicialELimparChamadas();
    permitirAjuste = false;
    await expect(gerarPlano(comAjuste(anterior), "token-auth-falso")).rejects.toThrow(
      /três tentativas/i,
    );
    expect(admin.rpc.mock.calls.map(([nome]) => nome)).toEqual(["nexa_limite_ajuste_ia"]);
    expect(requisitar).not.toHaveBeenCalled();
  });

  it("falha do provedor num ajuste não reembolsa uma geração semanal que não foi consumida", async () => {
    const anterior = await gerarInicialELimparChamadas();
    requisitar.mockResolvedValue(new Response("falha simulada", { status: 500 }));
    await expect(gerarPlano(comAjuste(anterior), "token-auth-falso")).rejects.toThrow(
      /Falha no Gemini/,
    );
    expect(admin.rpc.mock.calls.map(([nome]) => nome)).toEqual(["nexa_limite_ajuste_ia"]);
    expect(requisitar).toHaveBeenCalledTimes(1);
  });

  it("falha da geração inicial devolve sua cota semanal reservada", async () => {
    requisitar.mockResolvedValue(new Response("falha simulada", { status: 500 }));
    await expect(gerarPlano(entrada, "token-auth-falso")).rejects.toThrow(/Falha no Gemini/);
    expect(admin.rpc.mock.calls.map(([nome]) => nome)).toEqual([
      "nexa_consume_ai_generation",
      "nexa_refund_ai_generation",
    ]);
    expect(admin.rpc).toHaveBeenCalledWith("nexa_refund_ai_generation", {
      requested_user_id: usuario,
    });
  });

  it.each(["gemini", "lovable"])(
    "não envia a credencial de ajustes ao provedor %s",
    async (provedor) => {
      const anterior = await gerarInicialELimparChamadas();
      if (provedor === "lovable") {
        vi.stubEnv("GEMINI_API_KEY", "");
        vi.stubEnv("LOVABLE_API_KEY", "lovable-chave-falsa-sem-acesso-externo");
        requisitar.mockResolvedValue(
          Response.json({ choices: [{ message: { content: JSON.stringify(plano) } }] }),
        );
      }
      await gerarPlano(comAjuste(anterior), "token-auth-falso");
      expect(requisitar).toHaveBeenCalledTimes(1);
      const [, opcoes] = requisitar.mock.calls[0];
      expect(typeof opcoes?.body).toBe("string");
      expect(opcoes?.body).not.toContain(anterior.sessaoAjustes!);
      expect(opcoes?.body).not.toContain("sessaoAjustes");
      expect(opcoes?.body).not.toContain(segredo);
      expect(opcoes?.body).not.toContain("token-auth-falso");
    },
  );

  it("não mantém OCR liberado em ajustes após sair do plano Catálogo", async () => {
    perfil.subscription_tier = "catalog";
    const entradaOcr = { ...entrada, ocrCardapio: true };
    const anterior = await gerarPlano(entradaOcr, "token-auth-falso");
    admin.rpc.mockClear();
    requisitar.mockClear();
    perfil.subscription_tier = "professional";
    await expect(
      gerarPlano({ ...comAjuste(anterior), ocrCardapio: true }, "token-auth-falso"),
    ).rejects.toThrow(/menu_ocr_requires_catalog/);
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(requisitar).not.toHaveBeenCalled();
  });

  it.each([
    { subscription_tier: "essential", subscription_status: "active", admin_suspended_at: null },
    {
      subscription_tier: "professional",
      subscription_status: "canceled",
      admin_suspended_at: null,
    },
    {
      subscription_tier: "catalog",
      subscription_status: "active",
      admin_suspended_at: "2026-09-09T00:00:00Z",
    },
  ])(
    "revalida o plano e bloqueio da conta antes de liberar novos ajustes: %j",
    async (perfilAtual) => {
      const anterior = await gerarInicialELimparChamadas();
      perfil = perfilAtual;
      await expect(gerarPlano(comAjuste(anterior), "token-auth-falso")).rejects.toThrow(
        /plano não permite ajustes/i,
      );
      expect(admin.rpc).not.toHaveBeenCalled();
      expect(requisitar).not.toHaveBeenCalled();
    },
  );
});
