import { afterEach, describe, expect, it } from "vitest";
import { modelosUsuarioStore } from "@/lib/nexa/modelos-usuario";
import { aparenciaPersonalizada } from "@/lib/nexa/modelos-usuario";

class LocalStorageFalso {
  private dados = new Map<string, string>();
  getItem(chave: string) {
    return this.dados.get(chave) ?? null;
  }
  setItem(chave: string, valor: string) {
    this.dados.set(chave, valor);
  }
}

afterEach(() => {
  modelosUsuarioStore.reset();
  delete (globalThis as { window?: unknown }).window;
});

describe("modelos pessoais", () => {
  it("separa modelos locais por conta, mesmo no mesmo navegador", () => {
    const localStorage = new LocalStorageFalso();
    (globalThis as { window?: unknown }).window = { localStorage };

    modelosUsuarioStore.definirConta("conta-a");
    modelosUsuarioStore.salvar("Modelo da conta A", aparenciaPersonalizada());
    expect(modelosUsuarioStore.get()).toHaveLength(1);

    modelosUsuarioStore.definirConta("conta-b");
    expect(modelosUsuarioStore.get()).toEqual([]);
    modelosUsuarioStore.salvar("Modelo da conta B", aparenciaPersonalizada());

    modelosUsuarioStore.definirConta("conta-a");
    expect(modelosUsuarioStore.get().map((modelo) => modelo.nome)).toEqual(["Modelo da conta A"]);
  });
});
