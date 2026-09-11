import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  payment: vi.fn(),
  cancel: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: mocks.from, auth: { getUser: mocks.getUser } },
}));
vi.mock("@/lib/nexa/asaas.server", async (original) => ({
  ...(await original<object>()),
  buscarPagamentoAsaas: mocks.payment,
  cancelarAssinaturaAsaas: mocks.cancel,
}));
import { Route as WebhookRoute } from "@/routes/api/webhooks/asaas";
import { Route as CancelRoute } from "@/routes/api/billing/asaas/cancel";
type Handler = { server: { handlers: { POST: (ctx: { request: Request }) => Promise<Response> } } };
const webhook = (WebhookRoute as unknown as Handler).server.handlers.POST;
const cancel = (CancelRoute as unknown as Handler).server.handlers.POST;
let failedTable = "";
let cancelled = false;
let paymentStatus = "CONFIRMED";
const checkout = {
  id: "00000000-0000-4000-8000-000000000001",
  owner_id: "owner",
  tier: "essential",
  billing_cycle: "monthly",
};
const changes: string[] = [];
beforeEach(() => {
  vi.stubEnv("ASAAS_WEBHOOK_TOKEN", "test-secret");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  failedTable = "";
  cancelled = false;
  paymentStatus = "CONFIRMED";
  changes.length = 0;
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  mocks.cancel.mockResolvedValue({ nextDueDate: "2026-10-11" });
  mocks.payment.mockImplementation(async () => ({
    externalReference: `nexa-checkout:${checkout.id}`,
    status: paymentStatus,
    customer: "cus_test",
    subscription: "sub_test",
    value: 39,
  }));
  mocks.from.mockImplementation((table: string) => {
    const result = () => ({
      error: failedTable === table ? new Error("database unavailable") : null,
    });
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: checkout, error: null })),
      single: vi.fn(async () => ({
        data: {
          billing_provider: "asaas",
          billing_subscription_id: "sub_test",
          billing_cancel_at_period_end: cancelled,
          billing_current_period_end: "2026-10-11T23:59:59.999Z",
        },
        error: null,
      })),
      update: vi.fn(() => {
        changes.push(table);
        return chain;
      }),
      upsert: vi.fn(async () => {
        changes.push(table);
        return result();
      }),
      then: (resolve: (r: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return chain;
  });
});
afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
const event = (secret = "test-secret") => ({
  request: new Request("https://nexa.test/api/webhooks/asaas", {
    method: "POST",
    headers: { "asaas-access-token": secret },
    body: JSON.stringify({ payment: { id: "pay_test", status: "CONFIRMED" } }),
  }),
});
describe("webhook de cobrança sem movimentar dinheiro", () => {
  it("rejeita segredo inválido sem consultar o provedor", async () => {
    expect((await webhook(event("wrong"))).status).toBe(401);
    expect(mocks.payment).not.toHaveBeenCalled();
  });
  it("não ativa pela informação do corpo quando provedor informa pendência", async () => {
    paymentStatus = "PENDING";
    expect((await webhook(event())).status).toBe(202);
    expect(changes).toEqual([]);
  });
  it.each(["billing_invoices", "billing_checkout_sessions", "profiles"])(
    "devolve erro recuperável quando %s falha",
    async (table) => {
      failedTable = table;
      expect((await webhook(event())).status).toBe(503);
      if (table !== "profiles") expect(changes).not.toContain("profiles");
    },
  );
  it("grava fatura, checkout e perfil após confirmação consultada", async () => {
    expect((await webhook(event())).status).toBe(200);
    expect(changes).toEqual(["billing_invoices", "billing_checkout_sessions", "profiles"]);
  });
});
describe("cancelamento autenticado", () => {
  const request = () => ({
    request: new Request("https://nexa.test/api/billing/asaas/cancel", {
      method: "POST",
      headers: { Authorization: "Bearer fake" },
    }),
  });
  it("preserva o período e salva a interrupção de recorrência", async () => {
    const r = await cancel(request());
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ currentPeriodEnd: "2026-10-11T23:59:59.999Z" });
    expect(changes).toEqual(["profiles"]);
  });
  it("repetição já registrada não cancela novamente no provedor", async () => {
    cancelled = true;
    expect((await cancel(request())).status).toBe(200);
    expect(mocks.cancel).not.toHaveBeenCalled();
  });
  it("não anuncia sucesso quando gravação falha", async () => {
    failedTable = "profiles";
    expect((await cancel(request())).status).toBe(503);
  });
  it("não cancela sem autenticação", async () => {
    expect(
      (
        await cancel({
          request: new Request("https://nexa.test/api/billing/asaas/cancel", { method: "POST" }),
        })
      ).status,
    ).toBe(401);
    expect(mocks.cancel).not.toHaveBeenCalled();
  });
});
