/** Explicit opt-in only: temporary entitled accounts, real Supabase + deployed API, no billing. */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, expect, it, describe } from "vitest";
const enabled = process.env.NEXA_HOMOLOGATION_ACTIVE_PLAN === "yes";
describe.runIf(enabled)("transferência real autorizada, sem cobrança", () => {
  let admin: SupabaseClient;
  const accounts: Array<{ id: string; email: string; client: SupabaseClient; deleted?: boolean }> =
    [];
  const origin = "https://nexa-xi-puce.vercel.app";
  let siteId = "";
  let photo = "";
  let invitation = "";
  let slug = "";
  beforeAll(async () => {
    const url = process.env.SUPABASE_URL!,
      key = process.env.SUPABASE_SERVICE_ROLE_KEY!,
      anon = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
    if (!url || !key || !anon) throw new Error("Credenciais de teste ausentes");
    admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    for (const label of ["criador", "loja"]) {
      const email = `nexa.homologacao.${label}.${crypto.randomUUID()}@example.com`,
        password = `Hml!${crypto.randomUUID()}`;
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (created.error || !created.data.user)
        throw new Error("Não foi possível criar a conta fictícia");
      const client = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      accounts.push({ id: created.data.user.id, email, client });
      const logged = await client.auth.signInWithPassword({ email, password });
      if (logged.error) throw new Error("Falha no login fictício");
    }
    const p = await admin
      .from("profiles")
      .update({ subscription_tier: "catalog", subscription_status: "active" })
      .eq("id", accounts[0].id);
    if (p.error) throw p.error;
  }, 60000);
  afterAll(async () => {
    if (!admin) return;
    for (const a of accounts) {
      if (a.deleted) continue;
      const media = await admin.from("media").select("object_path").eq("owner_id", a.id);
      if (media.error) throw media.error;
      const paths = (media.data ?? []).map((m) => String(m.object_path));
      if (paths.some((p) => !p.startsWith(`${a.id}/`)))
        throw new Error("Limpeza recusada: arquivo fora da conta fictícia");
      if (paths.length) {
        const removed = await admin.storage.from("nexa-media").remove(paths);
        if (removed.error) throw removed.error;
      }
      const deleted = await a.client.rpc("delete_nexa_account");
      if (deleted.error) throw deleted.error;
      a.deleted = true;
    }
  }, 60000);
  it("cria loja publicada com arquivo real e histórico fictício", async () => {
    const a = accounts[0];
    const path = `${a.id}/homologacao-${crypto.randomUUID()}.png`;
    const bytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kD5sAAAAASUVORK5CYII=",
      "base64",
    );
    expect(
      (await a.client.storage.from("nexa-media").upload(path, bytes, { contentType: "image/png" }))
        .error,
    ).toBeNull();
    expect(
      (
        await a.client.from("media").insert({
          owner_id: a.id,
          bucket: "nexa-media",
          object_path: path,
          original_name: "homologacao.png",
          mime_type: "image/png",
          size_bytes: bytes.length,
        })
      ).error,
    ).toBeNull();
    photo = a.client.storage.from("nexa-media").getPublicUrl(path).data.publicUrl;
    slug = `hml-transferencia-${crypto.randomUUID().slice(0, 12)}`;
    const content = {
      modeloId: "cardapio-doceria",
      cliente: { empresa: "HOMOLOGAÇÃO TEMPORÁRIA — NÃO COMPRAR", segmento: "alimentacao" },
      conteudo: {
        nome: "HOMOLOGAÇÃO TEMPORÁRIA — NÃO COMPRAR",
        capa: photo,
        whatsapp: "11900000000",
        descricao: "Teste autorizado sem atendimento nem cobrança.",
      },
      produtos: [
        { id: "teste", nome: "Item de teste", preco: 1, categoria: "Teste", disponivel: false },
      ],
      secoes: [],
      comercio: { carrinho: false, pixChave: "chave-ficticia-privada" },
      mostrarAssinaturaNexa: true,
    };
    const saved = await a.client.rpc("save_minisite_draft", {
      requested_id: null,
      requested_slug: slug,
      site_content: content,
      client_content: { company: "HOMOLOGAÇÃO TEMPORÁRIA", segment: "alimentacao" },
    });
    expect(saved.error).toBeNull();
    siteId = saved.data.id;
    expect(
      (
        await a.client.rpc("save_minisite_version", {
          requested_site_id: siteId,
          requested_origin: "manual",
          requested_label: "Versão fictícia para homologação",
          requested_content: content,
        })
      ).error,
    ).toBeNull();
    expect((await a.client.rpc("publish_minisite", { requested_id: siteId })).error).toBeNull();
    expect(
      (
        await admin
          .from("form_submissions")
          .insert({ minisite_id: siteId, payload: { mensagem: "HISTÓRICO FICTÍCIO — NÃO COPIAR" } })
      ).error,
    ).toBeNull();
    const invite = await a.client.rpc("nexa_entrega_criar", {
      site_id: siteId,
      email: accounts[1].email,
      manter_acesso: true,
      guardar_copia: true,
    });
    expect(invite.error).toBeNull();
    invitation = invite.data;
  }, 60000);
  async function accept() {
    const token = (await accounts[1].client.auth.getSession()).data.session!.access_token;
    const response = await fetch(`${origin}/api/stores/accept`, {
      method: "POST",
      headers: { origin, "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ convite: invitation }),
      signal: AbortSignal.timeout(45000),
    });
    return { status: response.status, data: await response.json() };
  }
  it("bloqueia conta gratuita; plano temporário ativo permite aceite com cópia de mídia", async () => {
    const denied = await accept();
    expect(denied.status).toBe(409);
    expect(denied.data.error).toBe("subscription_required");
    expect(
      (
        await admin
          .from("profiles")
          .update({ subscription_tier: "catalog", subscription_status: "active" })
          .eq("id", accounts[1].id)
      ).error,
    ).toBeNull();
    const accepted = await accept();
    expect(accepted.status).toBe(200);
    expect(accepted.data.siteId).toBe(siteId);
    const received = await accounts[1].client
      .from("minisites")
      .select("owner_id,slug,status,published_content")
      .eq("id", siteId)
      .single();
    expect(received.error).toBeNull();
    expect(received.data!.owner_id).toBe(accounts[1].id);
    expect(received.data!.slug).toBe(slug);
    expect(received.data!.status).toBe("publicado");
    const newPhoto = received.data!.published_content.conteudo.capa as string;
    expect(newPhoto).not.toBe(photo);
    expect(newPhoto).toContain(accounts[1].id);
    expect((await fetch(newPhoto)).status).toBe(200);
    const copies = await accounts[0].client.from("minisites").select("id,status,draft_content");
    expect(copies.error).toBeNull();
    expect(copies.data).toHaveLength(1);
    expect(copies.data![0].id).not.toBe(siteId);
    expect(copies.data![0].status).toBe("rascunho");
    expect(JSON.stringify(copies.data![0].draft_content)).not.toContain("chave-ficticia-privada");
    const history = await accounts[1].client
      .from("form_submissions")
      .select("payload")
      .eq("minisite_id", siteId);
    expect(history.data).toHaveLength(1);
    const repeat = await accept();
    expect(repeat.status).toBe(200);
    expect(repeat.data.siteId).toBe(siteId);
  }, 60000);
  it("criador sai da equipe; loja e histórico continuam para destinatário", async () => {
    expect(
      (await accounts[0].client.rpc("nexa_operacao_sair", { site_id: siteId })).error,
    ).toBeNull();
    expect(
      (await accounts[0].client.rpc("nexa_operacao_dados", { site_id: siteId })).error,
    ).not.toBeNull();
    expect(
      (await accounts[1].client.rpc("nexa_operacao_dados", { site_id: siteId })).error,
    ).toBeNull();
    const page = await fetch(`${origin}/site/${slug}/cardapio`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("HOMOLOGAÇÃO");
    const versions = await accounts[1].client
      .from("minisite_versions")
      .select("id")
      .eq("minisite_id", siteId);
    expect(versions.error).toBeNull();
    expect(versions.data!.length).toBeGreaterThan(0);
  }, 60000);
  it("rebaixamento do destinatário pausa publicação sem apagar histórico", async () => {
    expect(
      (
        await admin
          .from("profiles")
          .update({ subscription_tier: "essential", subscription_status: "active" })
          .eq("id", accounts[1].id)
      ).error,
    ).toBeNull();
    const site = await accounts[1].client
      .from("minisites")
      .select("status")
      .eq("id", siteId)
      .single();
    expect(site.data?.status).toBe("pausado");
    const history = await accounts[1].client
      .from("form_submissions")
      .select("id")
      .eq("minisite_id", siteId);
    expect(history.data).toHaveLength(1);
  }, 30000);
});
