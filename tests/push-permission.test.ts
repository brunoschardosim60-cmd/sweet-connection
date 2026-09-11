import { describe, it, expect, vi } from "vitest";
import {
  pedirPermissaoDosAvisos,
  AVISOS_BLOQUEADOS,
  AVISOS_SEM_ESCOLHA,
} from "@/lib/nexa/push-permission";

describe("permissão de avisos", () => {
  it("pede permissão durante o clique quando ainda não houve escolha", async () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");
    const pending = pedirPermissaoDosAvisos({ permission: "default", requestPermission });
    expect(requestPermission).toHaveBeenCalledOnce();
    await expect(pending).resolves.toBeUndefined();
  });
  it("não tenta forçar um novo pedido quando o navegador bloqueou", async () => {
    const requestPermission = vi.fn();
    await expect(
      pedirPermissaoDosAvisos({ permission: "denied", requestPermission }),
    ).rejects.toThrow(AVISOS_BLOQUEADOS);
    expect(requestPermission).not.toHaveBeenCalled();
  });
  it("diferencia recusa explícita de pedido fechado sem escolha", async () => {
    await expect(
      pedirPermissaoDosAvisos({
        permission: "default",
        requestPermission: vi.fn().mockResolvedValue("denied"),
      }),
    ).rejects.toThrow(AVISOS_BLOQUEADOS);
    await expect(
      pedirPermissaoDosAvisos({
        permission: "default",
        requestPermission: vi.fn().mockResolvedValue("default"),
      }),
    ).rejects.toThrow(AVISOS_SEM_ESCOLHA);
  });
  it("reutiliza permissão concedida sem abrir outro pedido", async () => {
    const requestPermission = vi.fn();
    await expect(
      pedirPermissaoDosAvisos({ permission: "granted", requestPermission }),
    ).resolves.toBeUndefined();
    expect(requestPermission).not.toHaveBeenCalled();
  });
});
