import { describe, expect, it } from "vitest";
import { sessaoDaAba } from "@/integrations/supabase/tab-session";
function memoria(): Storage {
  const dados = new Map<string, string>();
  return {
    get length() {
      return dados.size;
    },
    key: (i) => [...dados.keys()][i] ?? null,
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => {
      dados.set(k, v);
    },
    removeItem: (k) => {
      dados.delete(k);
    },
    clear: () => dados.clear(),
  };
}
describe("sessões isoladas por documento", () => {
  it("separa canais, preserva a sessão existente e sobrevive a reload", () => {
    const storage = memoria();
    storage.setItem("auth", "conta-a");
    const antes = sessaoDaAba(storage, "auth", "pagina-1");
    const depois = sessaoDaAba(storage, "auth", "pagina-2");
    expect(antes.storageKey).not.toBe(depois.storageKey);
    expect(antes.storage!.getItem(antes.storageKey)).toBe("conta-a");
    antes.storage!.setItem(antes.storageKey, "conta-a-renovada");
    expect(depois.storage!.getItem(depois.storageKey)).toBe("conta-a-renovada");
  });
  it("login e saída de uma aba não alteram os dados da outra", () => {
    const a = sessaoDaAba(memoria(), "auth", "a");
    const b = sessaoDaAba(memoria(), "auth", "b");
    a.storage!.setItem(a.storageKey, "lojista");
    b.storage!.setItem(b.storageKey, "cliente");
    b.storage!.removeItem(b.storageKey);
    expect(a.storage!.getItem(a.storageKey)).toBe("lojista");
    expect(b.storage!.getItem(b.storageKey)).toBeNull();
  });
  it("mantém os sufixos de PKCE e não depende de storage durante SSR", () => {
    const storage = memoria();
    const a = sessaoDaAba(storage, "auth", "a");
    a.storage!.setItem(`${a.storageKey}-code-verifier`, "verificador");
    const b = sessaoDaAba(storage, "auth", "reload");
    expect(b.storage!.getItem(`${b.storageKey}-code-verifier`)).toBe("verificador");
    expect(sessaoDaAba(undefined, "auth", "ssr")).toEqual({ storageKey: "auth" });
  });
});
