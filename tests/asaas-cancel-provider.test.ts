import { afterEach, it, expect, vi } from "vitest";
import { cancelarAssinaturaAsaas } from "@/lib/nexa/asaas.server";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("consulta vencimento antes de excluir; resposta mínima não perde o período", async () => {
  vi.stubEnv("ASAAS_API_KEY", "fake-test-only");
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ id: "sub_test", nextDueDate: "2026-10-11" }))
    .mockResolvedValueOnce(Response.json({ deleted: true }));
  vi.stubGlobal("fetch", fetcher);
  expect(await cancelarAssinaturaAsaas("sub_test")).toHaveProperty("nextDueDate", "2026-10-11");
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[0][1].method).toBeUndefined();
  expect(fetcher.mock.calls[1][1].method).toBe("DELETE");
});
it("não cancela no provedor se não consegue verificar o período", async () => {
  vi.stubEnv("ASAAS_API_KEY", "fake-test-only");
  const fetcher = vi.fn().mockResolvedValue(Response.json({ id: "sub_test" }));
  vi.stubGlobal("fetch", fetcher);
  await expect(cancelarAssinaturaAsaas("sub_test")).rejects.toThrow("confirmar o período");
  expect(fetcher).toHaveBeenCalledTimes(1);
});
