import { afterEach, describe, expect, it, vi } from "vitest";
import { siteDoModelo } from "@/lib/nexa/demo-modelos";
import { lojaAbertaEm, horariosPedido } from "@/lib/nexa/atendimento";
import { taxaConhecida, rotuloTaxa } from "@/lib/nexa/checkout";
import { retornoSeguro } from "@/lib/nexa/auth-retorno";
const admin = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: admin }));
import { precoPorDistancia, cotarEntrega } from "@/lib/nexa/entrega.server";
const loja = () => {
  const s = siteDoModelo("cardapio-doceria");
  s.comercio = {
    ...s.comercio!,
    calculoEntrega: "distancia",
    enderecoOrigem: "Praça da Sé, São Paulo",
    faixasDistancia: [
      { ateKm: 10, taxa: 12 },
      { ateKm: 5, taxa: 7 },
    ],
  };
  return s;
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("entrega e agendamento", () => {
  it("usa a menor faixa suficiente, respeita limite exato e recusa fora da área", () => {
    const s = loja();
    expect(precoPorDistancia(s, 5000)).toBe(7);
    expect(precoPorDistancia(s, 5001)).toBe(12);
    expect(() => precoPorDistancia(s, 10001)).toThrow("outside_delivery_area");
    expect(() => precoPorDistancia(s, NaN)).toThrow("address_not_found");
    s.comercio!.faixasDistancia = [{ ateKm: 5, taxa: -1 }];
    expect(() => precoPorDistancia(s, 1)).toThrow("delivery_not_configured");
  });
  it("não anuncia frete grátis antes da cotação por distância", () => {
    const s = loja();
    expect(taxaConhecida(s, "entrega", "Centro")).toBe(false);
    expect(rotuloTaxa(s, "entrega")).toBe("Taxa ainda não calculada");
    expect(taxaConhecida(s, "retirada")).toBe(true);
  });
  it("horário noturno usa o fuso da loja, incluindo a madrugada seguinte", () => {
    const s = loja();
    s.comercio!.fusoHorario = "America/Manaus";
    s.conteudo.horarios = Array.from({ length: 7 }, (_, i) => ({
      dia: String(i),
      fechado: i !== 0,
      abre: "22:00",
      fecha: "02:00",
    }));
    expect(lojaAbertaEm(s, new Date("2026-09-08T05:59:00Z"))).toBe(true);
    expect(lojaAbertaEm(s, new Date("2026-09-08T06:00:00Z"))).toBe(false);
    const agora = new Date("2026-09-08T03:01:00Z");
    const slots = horariosPedido(s, agora);
    expect(slots.length).toBeGreaterThan(0);
    expect(
      slots.every(
        (h) =>
          new Date(h.valor).getTime() >= agora.getTime() + 1800000 &&
          lojaAbertaEm(s, new Date(h.valor)),
      ),
    ).toBe(true);
    s.comercio!.aceitarAgendamento = false;
    expect(horariosPedido(s, agora)).toEqual([]);
  });
  it("preserva retorno autenticado da operação sem permitir redirecionamento externo", () => {
    expect(retornoSeguro("/operacao?site=teste")).toBe("/operacao?site=teste");
    expect(retornoSeguro("//host.invalid/operacao")).toBe("/painel");
    expect(retornoSeguro("/operacao/../../externo")).toBe("/painel");
  });
  it("endpoint recusa outra origem antes de chamar provedores", async () => {
    const r = await cotarEntrega(
      new Request("https://nexa.invalid/api/delivery/quote", {
        method: "POST",
        headers: { origin: "https://outro.invalid" },
        body: "{}",
      }),
    );
    expect(r.status).toBe(403);
    expect(admin.rpc).not.toHaveBeenCalled();
  });
  it("endpoint mantém chave no servidor e vincula a cotação ao ID real do banco", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-only-secret");
    const s = loja();
    s.id = "snapshot-untrusted";
    admin.rpc.mockImplementation(async (name: string) => ({
      data: name === "get_published_minisite" ? s : true,
      error: null,
    }));
    const insert = vi.fn(() => ({
      select: () => ({
        single: async () => ({
          data: { id: "cotacao", expires_at: "2026-09-09T12:00:00Z" },
          error: null,
        }),
      }),
    }));
    admin.from.mockImplementation((table: string) =>
      table === "minisites"
        ? {
            select: () => ({
              eq: () => ({ single: async () => ({ data: { id: "database-id" }, error: null }) }),
            }),
          }
        : { insert },
    );
    const google = vi.fn(async () => Response.json({ routes: [{ distanceMeters: 3822 }] }));
    vi.stubGlobal("fetch", google);
    const r = await cotarEntrega(
      new Request("https://nexa.invalid/api/delivery/quote", {
        method: "POST",
        headers: { origin: "https://nexa.invalid" },
        body: JSON.stringify({
          slug: "teste",
          endereco: "Avenida Paulista, 1578",
          bairro: "Bela Vista",
        }),
      }),
    );
    expect(r.status).toBe(200);
    const payload = await r.json();
    expect(payload).toMatchObject({ id: "cotacao", taxa: 7, distanciaKm: 3.82 });
    expect(JSON.stringify(payload)).not.toContain("test-only-secret");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ minisite_id: "database-id", taxa: 7 }),
    );
    expect(google).toHaveBeenCalledOnce();
  });
});
