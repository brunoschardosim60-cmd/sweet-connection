/**
 * Verificações de autorização reais contra o Supabase do projeto usando a chave
 * pública (papel anon). Nada aqui grava dados: apenas confirma que as rotinas
 * administrativas e as tabelas protegidas negam acesso a quem não é admin.
 */
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

function envDoArquivo(chave: string): string | undefined {
  if (process.env[chave]) return process.env[chave];
  try {
    const conteudo = readFileSync(new URL("../.env", import.meta.url), "utf8");
    const linha = conteudo.split("\n").find((l) => l.trim().startsWith(`${chave}=`));
    return linha
      ?.slice(linha.indexOf("=") + 1)
      .trim()
      .replace(/^"|"$/g, "");
  } catch {
    return undefined;
  }
}

const url = envDoArquivo("VITE_SUPABASE_URL");
const chave =
  envDoArquivo("VITE_SUPABASE_PUBLISHABLE_KEY") ?? envDoArquivo("VITE_SUPABASE_ANON_KEY");
const configurado = Boolean(url && chave);

describe.runIf(configurado)("autorização administrativa (RLS)", () => {
  let anon: SupabaseClient;

  beforeAll(() => {
    anon = createClient(url!, chave!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it("nexa_admin_overview nega quem não é administrador", async () => {
    const { data, error } = await anon.rpc("nexa_admin_overview");
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("nexa_admin_users nega quem não é administrador", async () => {
    const { data, error } = await anon.rpc("nexa_admin_users");
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("nexa_admin_series nega quem não é administrador", async () => {
    const { data, error } = await anon.rpc("nexa_admin_series", { requested_days: 30 });
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("nexa_admin_audit nega quem não é administrador", async () => {
    const { data, error } = await anon.rpc("nexa_admin_audit", { requested_limit: 10 });
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("nexa_admin_set_plan nega quem não é administrador", async () => {
    const { error } = await anon.rpc("nexa_admin_set_plan", {
      requested_user_id: "00000000-0000-4000-8000-000000000000",
      requested_plan: "pro",
    });
    expect(error?.code).toBe("42501");
  });

  it("user_roles não expõe papéis para visitantes", async () => {
    const { data, error } = await anon.from("user_roles").select("user_id, role");
    expect(error ?? data).toBeTruthy();
    if (!error) expect(data).toEqual([]);
  });

  it("perfis, mini-sites e solicitações não vazam para visitantes", async () => {
    for (const tabela of ["profiles", "minisites", "form_submissions"] as const) {
      const { data, error } = await anon.from(tabela).select("id").limit(5);
      if (!error) expect(data).toEqual([]);
    }
  });

  it("visitante não consegue inserir papéis", async () => {
    const { error } = await anon
      .from("user_roles")
      .insert({ user_id: "00000000-0000-4000-8000-000000000000", role: "admin" });
    expect(error).not.toBeNull();
  });
});
