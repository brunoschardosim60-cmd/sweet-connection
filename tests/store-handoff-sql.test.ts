import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";

describe("entrega de loja em PostgreSQL isolado", () => {
  const db = new PGlite();
  const dono = "00000000-0000-4000-8000-000000000001",
    cliente = "00000000-0000-4000-8000-000000000002",
    intruso = "00000000-0000-4000-8000-000000000003";
  const site = "10000000-0000-4000-8000-000000000001";
  const conteudo = {
    id: site,
    slug: "loja-teste",
    modeloId: "cardapio-doceria",
    status: "publicado",
    mostrarAssinaturaNexa: false,
    aparencia: { corPrimaria: "#123456" },
    cliente: { empresa: "Loja teste", email: "loja@teste.invalid", segmento: "alimentacao" },
    conteudo: {
      nome: "Loja teste",
      whatsapp: "11999999999",
      capa: "https://media.invalid/antiga.webp",
    },
    secoes: [
      { id: "s1", tipo: "produtos", titulo: "Produtos", ativa: true },
      { id: "s2", tipo: "livre", titulo: "Contato", ativa: true, conteudo: "Contato privado" },
    ],
    produtos: [
      {
        id: "p1",
        nome: "Bolo",
        descricao: "Chocolate",
        preco: 30,
        categoria: "Bolos",
        variacoes: [],
        disponivel: true,
        destaque: true,
        estoque: 8,
        campoPrivado: "não copiar",
      },
    ],
    servicos: [],
    equipe: [{ nome: "Pessoa" }],
    depoimentos: [{ nome: "Cliente" }],
    integracoes: { whatsappApi: "segredo", dominio: "dominio-antigo" },
    comercio: { carrinho: true, pixChave: "pix privado", taxaEntrega: 5, pedidoMinimo: 0 },
  };
  beforeAll(async () => {
    await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
   alter default privileges in schema public grant execute on functions to anon,authenticated;
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
   create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz default now());
   create table profiles(id uuid primary key references auth.users,subscription_tier text default 'catalog',subscription_status text default 'active',admin_suspended_at timestamptz,billing_cancel_at_period_end boolean default false,billing_current_period_end timestamptz);
   create function has_role(uuid,text) returns boolean language sql as 'select false';
   create type nexa_site_status as enum('rascunho','publicado','pausado');
   create table clients(id uuid primary key default gen_random_uuid(),owner_id uuid references auth.users on delete cascade,company text,segment text,contact_name text default '',phone text default '',email text default '',city text default '',state text default '',unique(id,owner_id));
   create table minisites(id uuid primary key default gen_random_uuid(),owner_id uuid references auth.users on delete cascade,client_id uuid,slug text unique,status nexa_site_status,draft_content jsonb,published_content jsonb,expires_at timestamptz,published_at timestamptz,unique(id,owner_id),foreign key(client_id,owner_id) references clients(id,owner_id) on delete cascade);
   create table minisite_versions(id uuid primary key default gen_random_uuid(),minisite_id uuid,owner_id uuid,content jsonb,constraint versions_minisite_owner_fk foreign key(minisite_id,owner_id) references minisites(id,owner_id) on delete cascade);
   create table minisite_operadores(minisite_id uuid references minisites on delete cascade,user_id uuid references auth.users on delete cascade,created_by uuid references auth.users,primary key(minisite_id,user_id));
   create table operacao_auditoria(id serial,minisite_id uuid references minisites on delete cascade,user_id uuid references auth.users on delete set null,acao text,alvo uuid);
   create table pedidos_teste(id serial,minisite_id uuid references minisites on delete cascade,contato text);
   grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
   grant select,insert,update,delete on minisites,clients,minisite_versions to authenticated;
   alter table minisites enable row level security;create policy dono on minisites to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
   alter table clients enable row level security;create policy dono on clients to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
   alter table minisite_versions enable row level security;create policy dono on minisite_versions to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
  `);
    for (const f of [
      "20260823080000_fail_closed_cancelled_plan_access.sql",
      "20260823010000_catalog_project_safety_cap.sql",
      "20260909010000_store_handoff.sql",
    ])
      await db.exec(readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), "utf8"));
    await db.exec(
      "create trigger creation_limit before insert on minisites for each row execute function enforce_nexa_minisite_creation_limit();",
    );
  }, 30000);
  beforeEach(async () => {
    await db.exec("reset role;truncate minisites,clients,profiles,auth.users cascade;");
    for (const [id, email] of [
      [dono, "criador@teste.invalid"],
      [cliente, "cliente@teste.invalid"],
      [intruso, "intruso@teste.invalid"],
    ]) {
      await db.query("insert into auth.users(id,email) values($1,$2)", [id, email]);
      await db.query("insert into profiles(id) values($1)", [id]);
    }
    const c = (
      await db.query<{ id: string }>(
        "insert into clients(owner_id,company,segment,email) values($1,'Loja teste','alimentacao','empresa@teste.invalid') returning id",
        [dono],
      )
    ).rows[0]!.id;
    await db.query(
      "insert into minisites(id,owner_id,client_id,slug,status,draft_content,published_content) values($1,$2,$3,'loja-teste','publicado',$4::jsonb,$4::jsonb)",
      [site, dono, c, JSON.stringify(conteudo)],
    );
    await db.query(
      "insert into minisite_versions(minisite_id,owner_id,content) values($1,$2,$3::jsonb)",
      [site, dono, JSON.stringify(conteudo)],
    );
    await db.query(
      "insert into pedidos_teste(minisite_id,contato) values($1,'Cliente real não é copiado')",
      [site],
    );
  });
  afterAll(() => db.close());
  const login = async (id: string) => {
    await db.exec("reset role");
    await db.query("select set_config('test.uid',$1,false)", [id]);
    await db.exec("set role authenticated");
  };
  const convidar = async (manter = false, copia = true) => {
    await login(dono);
    return (
      await db.query<{ id: string }>(
        "select nexa_entrega_criar($1,'cliente@teste.invalid',$2,$3) id",
        [site, manter, copia],
      )
    ).rows[0]!.id;
  };
  const preparar = async (id: string, usuario = cliente) => {
    await db.exec("reset role;set role service_role");
    return (
      await db.query<{ r: { revisao: string; siteId: string; aceita?: boolean } }>(
        "select nexa_entrega_preparar($1,$2) r",
        [id, usuario],
      )
    ).rows[0]!.r;
  };
  const finalizar = async (id: string, revisao: string, usuario = cliente) => {
    await db.exec("reset role;set role service_role");
    return db.query("select nexa_entrega_finalizar($1,$2,$3,$4::jsonb)", [
      id,
      usuario,
      revisao,
      JSON.stringify({ "https://media.invalid/antiga.webp": "https://media.invalid/nova.webp" }),
    ]);
  };
  it("restringe criação ao dono e consulta/aceite ao destinatário", async () => {
    const id = await convidar();
    await login(intruso);
    await expect(
      db.query("select nexa_entrega_criar($1,'intruso@teste.invalid')", [site]),
    ).rejects.toThrow("not_allowed");
    await expect(db.query("select nexa_entrega_consultar($1)", [id])).rejects.toThrow(
      "not_allowed",
    );
    await expect(db.query("select * from minisite_entregas")).rejects.toThrow("permission denied");
    await expect(
      db.query("select nexa_entrega_finalizar($1,$2,'hash','{}')", [id, intruso]),
    ).rejects.toThrow("permission denied");
    await expect(preparar(id, intruso)).rejects.toThrow("not_allowed");
    await login(cliente);
    expect(
      (
        await db.query<{ r: { destinatario: boolean } }>("select nexa_entrega_consultar($1) r", [
          id,
        ])
      ).rows[0]?.r.destinatario,
    ).toBe(true);
  });
  it("exige e-mail confirmado, assinatura ativa e plano compatível", async () => {
    const id = await convidar();
    await db.exec("reset role");
    await db.query("update auth.users set email_confirmed_at=null where id=$1", [cliente]);
    await expect(preparar(id)).rejects.toThrow("not_allowed");
    await db.exec("reset role");
    await db.query("update auth.users set email_confirmed_at=now() where id=$1", [cliente]);
    await db.query("update profiles set subscription_status='inactive' where id=$1", [cliente]);
    await expect(preparar(id)).rejects.toThrow("subscription_required");
    await db.exec("reset role");
    await db.query(
      "update profiles set subscription_status='active',subscription_tier='professional' where id=$1",
      [cliente],
    );
    await expect(preparar(id)).rejects.toThrow("plan_upgrade_required");
    await db.exec("reset role");
    expect(
      (await db.query<{ owner_id: string }>("select owner_id from minisites where id=$1", [site]))
        .rows[0]?.owner_id,
    ).toBe(dono);
  });
  it("convite novo revoga anterior; revogação e expiração não mudam a loja", async () => {
    const a = await convidar(),
      b = await convidar();
    await expect(preparar(a)).rejects.toThrow("invitation_unavailable");
    await login(dono);
    await db.query("select nexa_entrega_cancelar($1)", [b]);
    await expect(preparar(b)).rejects.toThrow("invitation_unavailable");
    const c = await convidar();
    await db.exec("reset role");
    await db.query(
      "update minisite_entregas set expires_at=now()-interval '1 second' where id=$1",
      [c],
    );
    await expect(preparar(c)).rejects.toThrow("invitation_unavailable");
  });
  it("transfere atomicamente endereço, versões e histórico; cópia limpa e sem acesso antigo", async () => {
    const id = await convidar();
    const p = await preparar(id);
    await finalizar(id, p.revisao);
    await login(dono);
    const minhas = (
      await db.query<{ id: string; draft_content: Record<string, unknown>; status: string }>(
        "select id,draft_content,status from minisites",
      )
    ).rows;
    expect(minhas).toHaveLength(1);
    expect(minhas[0]?.id).not.toBe(site);
    expect(minhas[0]?.status).toBe("rascunho");
    const limpo = JSON.stringify(minhas[0]?.draft_content);
    for (const segredo of [
      "pix privado",
      "Contato privado",
      "segredo",
      "11999999999",
      "não copiar",
      "Cliente real",
    ])
      expect(limpo).not.toContain(segredo);
    expect((await db.query("select * from minisite_versions")).rows).toHaveLength(0);
    await login(cliente);
    const recebida = (
      await db.query<{
        slug: string;
        published_content: { conteudo: { capa: string }; integracoes: { whatsappApi: string } };
      }>("select slug,published_content from minisites")
    ).rows[0]!;
    expect(recebida.slug).toBe("loja-teste");
    expect(recebida.published_content.conteudo.capa).toContain("nova.webp");
    expect(recebida.published_content.integracoes.whatsappApi).toBe("");
    expect((await db.query("select * from minisite_versions")).rows).toHaveLength(1);
    await db.exec("reset role");
    expect(
      (await db.query("select * from pedidos_teste where minisite_id=$1", [site])).rows,
    ).toHaveLength(1);
    expect(
      (await db.query("select * from minisite_operadores where minisite_id=$1", [site])).rows,
    ).toHaveLength(0);
    await finalizar(id, p.revisao);
    await db.exec("reset role");
    expect((await db.query("select * from minisites")).rows).toHaveLength(2);
  });
  it("colaborador pode sair sem despublicar e conta do criador pode ser removida sem levar a loja", async () => {
    const id = await convidar(true, false),
      p = await preparar(id);
    await finalizar(id, p.revisao);
    await login(dono);
    await db.query("select nexa_operacao_sair($1)", [site]);
    await login(cliente);
    await expect(db.query("select nexa_operacao_sair($1)", [site])).rejects.toThrow(
      "owner_cannot_leave",
    );
    await db.exec("reset role");
    await db.query("delete from profiles where id=$1", [dono]);
    await db.query("delete from auth.users where id=$1", [dono]);
    expect(
      (await db.query<{ status: string }>("select status from minisites where id=$1", [site]))
        .rows[0]?.status,
    ).toBe("publicado");
  });
  it("revalida versão e plano no aceite final; erro não cria cópia nem troca proprietário", async () => {
    const id = await convidar(),
      p = await preparar(id);
    await db.exec("reset role");
    await db.query(
      "update minisites set draft_content=draft_content||'{\"mudou\":true}' where id=$1",
      [site],
    );
    await expect(finalizar(id, p.revisao)).rejects.toThrow("site_changed");
    const atualizado = await preparar(id);
    await db.exec("reset role");
    await db.query("update profiles set subscription_status='inactive' where id=$1", [cliente]);
    await expect(finalizar(id, atualizado.revisao)).rejects.toThrow("subscription_required");
    await db.exec("reset role");
    expect((await db.query("select * from minisites")).rows).toHaveLength(1);
  });
  it("rebaixamento do novo dono pausa recursos pagos sem apagar pedidos ou conteúdo", async () => {
    const id = await convidar(false, false),
      p = await preparar(id);
    await finalizar(id, p.revisao);
    await db.exec("reset role");
    await db.query("update profiles set subscription_tier='essential' where id=$1", [cliente]);
    expect(
      (await db.query<{ status: string }>("select status from minisites where id=$1", [site]))
        .rows[0]?.status,
    ).toBe("pausado");
    expect((await db.query("select * from pedidos_teste")).rows).toHaveLength(1);
    await login(cliente);
    await expect(
      db.query("update minisites set status='publicado' where id=$1", [site]),
    ).rejects.toThrow("plan_upgrade_required");
  });
  it("não permite acesso a convite já aceito por reuso posterior de e-mail", async () => {
    const id = await convidar(false, false),
      p = await preparar(id);
    await finalizar(id, p.revisao);
    await db.exec("reset role");
    await db.query("update auth.users set email='novo@teste.invalid' where id=$1", [cliente]);
    await db.query("update auth.users set email='cliente@teste.invalid' where id=$1", [intruso]);
    await login(intruso);
    await expect(db.query("select nexa_entrega_consultar($1)", [id])).rejects.toThrow(
      "not_allowed",
    );
    await login(cliente);
    await expect(db.query("select nexa_entrega_consultar($1)", [id])).resolves.toBeDefined();
  });
});
