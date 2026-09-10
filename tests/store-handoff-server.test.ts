import { afterEach, describe, it, expect, vi } from "vitest";
const admin = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  rpc: vi.fn(),
  from: vi.fn(),
  storage: { from: vi.fn() },
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: admin }));
import { midiasDaEntrega, aceitarEntregaLoja } from "@/lib/nexa/entrega-loja.server";
import { retornoSeguro } from "@/lib/nexa/auth-retorno";
const base = "https://teste.supabase.co",
  convite = "00000000-0000-4000-8000-000000000001";
const requisicao = () =>
  new Request("https://nexa.invalid/api/stores/accept", {
    method: "POST",
    headers: { authorization: "Bearer token-teste", origin: "https://nexa.invalid" },
    body: JSON.stringify({ convite }),
  });
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
describe("entrega de loja pelo servidor", () => {
  it("mantém autenticação vinculada ao convite sem permitir retorno externo", () => {
    expect(retornoSeguro(`/entrega?convite=${convite}`)).toBe(`/entrega?convite=${convite}`);
    expect(retornoSeguro("//outro.invalid/entrega")).toBe("/painel");
    expect(retornoSeguro("/entrega/../../privado")).toBe("/painel");
  });
  it("coleta apenas imagens do bucket autorizado incluindo versões antigas", () => {
    const url = `${base}/storage/v1/object/public/nexa-media/origem/foto.webp`;
    const urls = midiasDaEntrega(
      {
        capa: url,
        versoes: [
          { foto: `${base}/storage/v1/render/image/public/nexa-media/origem/antes.webp?width=600` },
        ],
        malicioso: "http://169.254.169.254/secrets",
        outraOrigem: "https://outro.invalid/storage/v1/object/public/nexa-media/foto",
      },
      base,
    );
    expect([...urls.values()]).toEqual(["origem/foto.webp", "origem/antes.webp"]);
  });
  it("rejeita origem externa e falta de autenticação sem consultar dados", async () => {
    const r = await aceitarEntregaLoja(
      new Request("https://nexa.invalid/api/stores/accept", {
        method: "POST",
        headers: { origin: "https://fora.invalid" },
        body: "{}",
      }),
    );
    expect(r.status).toBe(403);
    expect(
      (
        await aceitarEntregaLoja(
          new Request("https://nexa.invalid/api/stores/accept", { method: "POST", body: "{}" }),
        )
      ).status,
    ).toBe(401);
    expect(admin.rpc).not.toHaveBeenCalled();
  });
  it("não copia arquivos nem finaliza quando plano não permite", async () => {
    admin.auth.getUser.mockResolvedValue({
      data: { user: { id: "destino", email_confirmed_at: "sim" } },
      error: null,
    });
    admin.rpc.mockImplementation(async (name: string) =>
      name === "nexa_limite_cotacao"
        ? { data: true, error: null }
        : { data: null, error: { message: "plan_upgrade_required" } },
    );
    const r = await aceitarEntregaLoja(requisicao());
    expect(await r.json()).toEqual({ error: "plan_upgrade_required" });
    expect(admin.storage.from).not.toHaveBeenCalled();
  });
  it("copia mídia para a conta do destinatário antes da troca de dono, sem apagar a origem", async () => {
    vi.stubEnv("SUPABASE_URL", base);
    const antiga = `${base}/storage/v1/object/public/nexa-media/criador/foto.webp`;
    admin.auth.getUser.mockResolvedValue({
      data: { user: { id: "destino", email_confirmed_at: "sim" } },
      error: null,
    });
    admin.rpc.mockImplementation(async (name: string) => ({
      data:
        name === "nexa_limite_cotacao"
          ? true
          : name === "nexa_entrega_preparar"
            ? {
                siteId: "site",
                revisao: "hash",
                pacote: { foto: antiga, versao: { foto: antiga } },
              }
            : { aceita: true, siteId: "site" },
      error: null,
    }));
    const bucket = {
      download: vi.fn(async () => ({
        data: new Blob(["imagem"], { type: "image/webp" }),
        error: null,
      })),
      upload: vi.fn(async () => ({ data: {}, error: null })),
      getPublicUrl: vi.fn((path: string) => ({
        data: { publicUrl: `${base}/storage/v1/object/public/nexa-media/${path}` },
      })),
    };
    admin.storage.from.mockReturnValue(bucket);
    admin.from.mockReturnValue({ upsert: vi.fn(async () => ({ error: null })) });
    const r = await aceitarEntregaLoja(requisicao());
    expect(r.status).toBe(200);
    expect(bucket.download).toHaveBeenCalledOnce();
    expect(bucket.upload).toHaveBeenCalledWith(
      expect.stringContaining(`destino/entregas/${convite}/`),
      expect.any(Blob),
      expect.objectContaining({ upsert: false }),
    );
    expect(admin.rpc).toHaveBeenLastCalledWith(
      "nexa_entrega_finalizar",
      expect.objectContaining({
        usuario: "destino",
        revisao: "hash",
        mapa: expect.objectContaining({ [antiga]: expect.stringContaining("/destino/entregas/") }),
      }),
    );
  });
  it("falha ao copiar uma imagem nunca finaliza a transferência", async () => {
    vi.stubEnv("SUPABASE_URL", base);
    admin.auth.getUser.mockResolvedValue({
      data: { user: { id: "destino", email_confirmed_at: "sim" } },
      error: null,
    });
    admin.rpc.mockImplementation(async (name: string) => ({
      data:
        name === "nexa_limite_cotacao"
          ? true
          : {
              siteId: "site",
              revisao: "hash",
              pacote: { capa: `${base}/storage/v1/object/public/nexa-media/criador/foto.webp` },
            },
      error: null,
    }));
    admin.storage.from.mockReturnValue({
      download: vi.fn(async () => ({ data: null, error: { message: "Not found" } })),
    });
    const r = await aceitarEntregaLoja(requisicao());
    expect(await r.json()).toEqual({ error: "media_copy_failed" });
    expect(admin.rpc.mock.calls.some((c) => c[0] === "nexa_entrega_finalizar")).toBe(false);
  });
});
