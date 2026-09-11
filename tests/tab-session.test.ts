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
  const token = (id: string, refresh = "inicial") =>
    JSON.stringify({ user: { id }, refresh_token: refresh });
  it("só restaura em outra aba após consentimento explícito", () => {
    const local = memoria();
    const a = sessaoDaAba(memoria(), "auth", "a", local);
    a.storage!.setItem(a.storageKey, token("loja"));
    const semConsentimento = sessaoDaAba(memoria(), "auth", "b", local);
    expect(semConsentimento.storage!.getItem(semConsentimento.storageKey)).toBeNull();
    expect(a.lembrar!(true)).toBe(true);
    const c = sessaoDaAba(memoria(), "auth", "c", local);
    expect(c.storage!.getItem(c.storageKey)).toBe(token("loja"));
    expect(c.storageKey).not.toBe(a.storageKey);
  });
  it("não troca a conta de abas existentes nem persiste outra conta sem consentimento", () => {
    const local = memoria();
    const a = sessaoDaAba(memoria(), "auth", "a", local);
    a.storage!.setItem(a.storageKey, token("loja"));
    a.lembrar!(true);
    const b = sessaoDaAba(memoria(), "auth", "b", local);
    b.storage!.setItem(b.storageKey, token("cliente"));
    b.lembrar!(false);
    expect(a.storage!.getItem(a.storageKey)).toBe(token("loja"));
    b.lembrar!(true);
    expect(a.storage!.getItem(a.storageKey)).toBe(token("loja"));
    a.storage!.setItem(a.storageKey, token("loja", "renovada"));
    const c = sessaoDaAba(memoria(), "auth", "c", local);
    expect(c.storage!.getItem(c.storageKey)).toBe(token("cliente"));
  });
  it("compartilha renovações só entre abas vinculadas à mesma conexão", () => {
    const local = memoria();
    const a = sessaoDaAba(memoria(), "auth", "a", local);
    a.storage!.setItem(a.storageKey, token("loja"));
    a.lembrar!(true);
    const b = sessaoDaAba(memoria(), "auth", "b", local);
    a.storage!.setItem(a.storageKey, token("loja", "renovada"));
    expect(b.storage!.getItem(b.storageKey)).toBe(token("loja", "renovada"));
  });
  it("sair remove a conexão salva e outra aba antiga não a recria", () => {
    const local = memoria();
    const tab = memoria();
    const a = sessaoDaAba(tab, "auth", "a", local);
    a.storage!.setItem(a.storageKey, token("loja"));
    a.lembrar!(true);
    const b = sessaoDaAba(memoria(), "auth", "b", local);
    a.storage!.removeItem(a.storageKey);
    b.storage!.setItem(b.storageKey, token("loja", "tardia"));
    const c = sessaoDaAba(memoria(), "auth", "c", local);
    expect(c.storage!.getItem(c.storageKey)).toBeNull();
    const reload = sessaoDaAba(tab, "auth", "reload", local);
    expect(reload.storage!.getItem(reload.storageKey)).toBeNull();
  });
  it("sair de outra conta não apaga a conta lembrada", () => {
    const local = memoria();
    const a = sessaoDaAba(memoria(), "auth", "a", local);
    a.storage!.setItem(a.storageKey, token("loja"));
    a.lembrar!(true);
    const b = sessaoDaAba(memoria(), "auth", "b", local);
    b.storage!.setItem(b.storageKey, token("cliente"));
    b.storage!.removeItem(b.storageKey);
    const c = sessaoDaAba(memoria(), "auth", "c", local);
    expect(c.storage!.getItem(c.storageKey)).toBe(token("loja"));
  });
  it("não restaura registro expirado, inválido ou armazenamento bloqueado", () => {
    const local = memoria();
    local.setItem(
      "auth-remembered",
      JSON.stringify({ id: "v", value: token("loja"), expiresAt: 0 }),
    );
    const a = sessaoDaAba(memoria(), "auth", "a", local);
    expect(a.storage!.getItem(a.storageKey)).toBeNull();
    local.setItem("auth-remembered", "invalid");
    expect(sessaoDaAba(memoria(), "auth", "b", local).storage!.getItem("auth")).toBeNull();
    const blocked = {
      ...memoria(),
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    const c = sessaoDaAba(memoria(), "auth", "c", blocked);
    c.storage!.setItem(c.storageKey, token("loja"));
    expect(c.lembrar!(true)).toBe(false);
    expect(c.storage!.getItem(c.storageKey)).toBe(token("loja"));
  });
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
