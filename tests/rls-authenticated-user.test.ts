/**
 * Creates one temporary real account against the configured Supabase project,
 * verifies the authenticated non-admin boundary and removes the account at the
 * end. No credentials are logged or committed.
 */
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database, Json } from "@/integrations/supabase/types";

function envDoArquivo(chave: string): string | undefined {
  if (process.env[chave]) return process.env[chave];
  try {
    const linha = readFileSync(".env", "utf8")
      .split(/\r?\n/)
      .find((item) => item.trim().startsWith(`${chave}=`));
    return linha
      ?.slice(linha.indexOf("=") + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
  } catch {
    return undefined;
  }
}

const url = envDoArquivo("VITE_SUPABASE_URL") ?? envDoArquivo("SUPABASE_URL");
const chave =
  envDoArquivo("VITE_SUPABASE_PUBLISHABLE_KEY") ?? envDoArquivo("SUPABASE_PUBLISHABLE_KEY");
const configurado = Boolean(url && chave);

describe.runIf(configurado)("autorização de usuário autenticado", () => {
  let cliente: SupabaseClient<Database>;
  let clienteSecundario: SupabaseClient<Database>;
  let userId = "";
  let userIdSecundario = "";

  beforeAll(async () => {
    cliente = createClient<Database>(url!, chave!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const email = `codex.audit.${Date.now()}.${crypto.randomUUID()}@example.com`;
    const senha = `Audit!${crypto.randomUUID()}`;
    const { data, error } = await cliente.auth.signUp({ email, password: senha });
    if (error) throw error;
    if (!data.session || !data.user) {
      throw new Error(
        "O projeto exige confirmação de e-mail; o teste autenticado não recebeu sessão.",
      );
    }
    userId = data.user.id;

    clienteSecundario = createClient<Database>(url!, chave!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const segundoEmail = `codex.audit.segundo.${Date.now()}.${crypto.randomUUID()}@example.com`;
    const segundo = await clienteSecundario.auth.signUp({
      email: segundoEmail,
      password: `Audit!${crypto.randomUUID()}`,
    });
    if (segundo.error || !segundo.data.session || !segundo.data.user) {
      throw segundo.error ?? new Error("A segunda conta de auditoria não recebeu sessão.");
    }
    userIdSecundario = segundo.data.user.id;
  });

  afterAll(async () => {
    if (!userId) return;
    const { error } = await cliente.rpc("delete_nexa_account");
    if (error) throw error;
    if (userIdSecundario) {
      const { error: erroSecundario } = await clienteSecundario.rpc("delete_nexa_account");
      if (erroSecundario) throw erroSecundario;
    }
  });

  it("nasce no plano gratuito e não recebe papel administrativo", async () => {
    const [perfil, papeis] = await Promise.all([
      cliente.from("profiles").select("id, plan").eq("id", userId).single(),
      cliente.from("user_roles").select("role").eq("user_id", userId),
    ]);
    expect(perfil.error).toBeNull();
    expect(perfil.data?.plan).toBe("free");
    expect(papeis.error).toBeNull();
    expect(papeis.data).toEqual([]);
  });

  it("não consegue promover o próprio plano por update direto", async () => {
    const { error } = await cliente.from("profiles").update({ plan: "pro" }).eq("id", userId);
    expect(error?.code).toBe("42501");

    const { data } = await cliente.from("profiles").select("plan").eq("id", userId).single();
    expect(data?.plan).toBe("free");
  });

  it("não consegue consultar nem executar funções administrativas", async () => {
    const chamadas = await Promise.all([
      cliente.rpc("nexa_admin_overview"),
      cliente.rpc("nexa_admin_users"),
      cliente.rpc("nexa_admin_series", { requested_days: 7 }),
      cliente.rpc("nexa_admin_audit", { requested_limit: 10 }),
      cliente.rpc("nexa_admin_set_plan", { requested_user_id: userId, requested_plan: "pro" }),
    ]);
    for (const chamada of chamadas) expect(chamada.error?.code).toBe("42501");
  });

  it("não consegue inserir papel de administrador diretamente", async () => {
    const { error } = await cliente.from("user_roles").insert({ user_id: userId, role: "admin" });
    expect(error).not.toBeNull();
  });

  it("isola mini-sites, solicitações e alterações entre duas contas reais", async () => {
    const slug = `auditoria-${crypto.randomUUID().slice(0, 12)}`;
    const { data: criado, error: erroCriacao } = await cliente.rpc("save_minisite_draft", {
      requested_slug: slug,
      site_content: { conteudo: { nome: "Site de auditoria" } } as Json,
      client_content: { company: "Cliente de auditoria" } as Json,
      requested_id: null,
    });
    expect(erroCriacao).toBeNull();
    expect(criado?.id).toBeTruthy();

    const siteId = criado!.id;
    const [sites, solicitacoes] = await Promise.all([
      clienteSecundario.from("minisites").select("id").eq("id", siteId),
      clienteSecundario.from("form_submissions").select("id").eq("minisite_id", siteId),
    ]);
    expect(sites.error).toBeNull();
    expect(sites.data).toEqual([]);
    expect(solicitacoes.error).toBeNull();
    expect(solicitacoes.data).toEqual([]);

    const { error: erroEdicao } = await clienteSecundario.rpc("save_minisite_draft", {
      requested_slug: `${slug}-tentativa`,
      site_content: { conteudo: { nome: "Tentativa indevida" } } as Json,
      client_content: { company: "Tentativa indevida" } as Json,
      requested_id: siteId,
    });
    expect(erroEdicao?.code).toBe("P0002");
  });
});
