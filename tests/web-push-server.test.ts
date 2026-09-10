import { beforeEach, afterEach, expect, it, vi } from "vitest";
const deps = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  rpc: vi.fn(),
  from: vi.fn(),
  send: vi.fn(),
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: deps }));
vi.mock("web-push", () => ({ default: { sendNotification: deps.send } }));
import { assinaturaPush, processarPush } from "@/lib/nexa/push.server";
const site = "10000000-0000-4000-8000-000000000001";
const user = "20000000-0000-4000-8000-000000000001";
const device = {
  user_id: user,
  endpoint: "https://fcm.googleapis.com/fake",
  keys: { p256dh: "A".repeat(87), auth: "B".repeat(22) },
};
let member = true;
let changes: Array<{ table: string; value: unknown }>;
beforeEach(() => {
  vi.stubEnv("WEB_PUSH_PUBLIC_KEY", "public");
  vi.stubEnv("WEB_PUSH_PRIVATE_KEY", "private");
  vi.stubEnv("WEB_PUSH_SUBJECT", "https://example.com");
  vi.stubEnv("PUSH_DISPATCH_SECRET", "test-secret");
  deps.auth.getUser.mockResolvedValue({ data: { user: { id: user } }, error: null });
  deps.rpc.mockResolvedValue({ data: true, error: null });
  deps.send.mockResolvedValue({ statusCode: 201 });
  member = true;
  changes = [];
  deps.from.mockImplementation((table: string) => {
    const q = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      update: vi.fn((value: unknown) => {
        changes.push({ table, value });
        return q;
      }),
      maybeSingle: vi.fn(async () => ({
        data:
          table === "nexa_push_devices"
            ? device
            : table === "minisites"
              ? { owner_id: "other" }
              : table === "nexa_push_stores"
                ? { device_id: "device" }
                : member
                  ? { user_id: user }
                  : null,
        error: null,
      })),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ error: null }).then(resolve),
    };
    return q;
  });
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
function request(body: unknown, token = "token") {
  return new Request("https://nexa.example/api/notifications/push", {
    method: "POST",
    headers: { origin: "https://nexa.example", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}
const subscription = { endpoint: device.endpoint, keys: device.keys };
function drain() {
  deps.rpc.mockResolvedValue({
    data: [
      {
        id: "job",
        device_id: "device",
        site_id: site,
        source_type: "pedido",
        attempts: 1,
        created_at: new Date().toISOString(),
      },
    ],
    error: null,
  });
  return processarPush(
    new Request("https://nexa.example/api/notifications/push-dispatch", {
      method: "POST",
      headers: { authorization: "Bearer test-secret" },
    }),
  );
}
it("configuração pública nunca devolve chave privada ou segredo do despachante", async () => {
  expect(
    await (await assinaturaPush(new Request("https://nexa.example/api/notifications/push"))).json(),
  ).toEqual({ publicKey: "public" });
});
it("nega origem externa e sessão inválida antes de alterar inscrição", async () => {
  const external = new Request("https://nexa.example/api/notifications/push", {
    method: "POST",
    headers: { origin: "https://attacker.test" },
  });
  expect((await assinaturaPush(external)).status).toBe(403);
  deps.auth.getUser.mockResolvedValue({ data: { user: null }, error: "invalid" });
  expect((await assinaturaPush(request({}))).status).toBe(401);
  expect(deps.rpc).not.toHaveBeenCalled();
});
it("usa o usuário autenticado, não um user_id fornecido no corpo", async () => {
  expect(
    (await assinaturaPush(request({ site, action: "enable", subscription, user_id: "attacker" })))
      .status,
  ).toBe(200);
  expect(deps.rpc).toHaveBeenCalledWith(
    "nexa_push_subscription",
    expect.objectContaining({ requested_user: user }),
  );
});
it("nega despachante sem segredo válido antes de consultar fila", async () => {
  expect((await processarPush(new Request("https://nexa.example/"))).status).toBe(401);
  expect(deps.rpc).not.toHaveBeenCalled();
});
it("revogação da equipe depois do enfileiramento impede envio", async () => {
  member = false;
  await drain();
  expect(deps.send).not.toHaveBeenCalled();
  expect(changes).toContainEqual({ table: "nexa_push_jobs", value: { status: "skipped" } });
});
it("envia apenas aviso genérico com link da loja, sem contato do cliente", async () => {
  expect(await (await drain()).json()).toEqual({ processed: 1, sent: 1 });
  const payload = JSON.parse(deps.send.mock.calls[0][1]);
  expect(payload.url).toBe(`/operacao?site=${site}`);
  expect(payload).not.toHaveProperty("nome");
  expect(payload).not.toHaveProperty("telefone");
});
it("erro transitório volta à fila com atraso", async () => {
  deps.send.mockRejectedValue({ statusCode: 503 });
  await drain();
  expect(changes).toContainEqual({
    table: "nexa_push_jobs",
    value: expect.objectContaining({ status: "pending", available_at: expect.any(String) }),
  });
});
it("assinatura expirada é removida, sem insistir no provedor", async () => {
  deps.send.mockRejectedValue({ statusCode: 410 });
  await drain();
  expect(deps.from).toHaveBeenCalledWith("nexa_push_devices");
  const deviceCalls = deps.from.mock.results.filter(
    (_, i) => deps.from.mock.calls[i][0] === "nexa_push_devices",
  );
  expect(deviceCalls.some((r) => r.value.delete.mock.calls.length > 0)).toBe(true);
});
