import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
const db = new PGlite();
const owner = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002";
const site = "10000000-0000-4000-8000-000000000001";
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
    create table auth.users(id uuid primary key);
    create table minisites(id uuid primary key,owner_id uuid);
    create table minisite_operadores(minisite_id uuid,user_id uuid);
    create table pedidos_cardapio(id uuid primary key default gen_random_uuid(),minisite_id uuid);
    create table form_submissions(like pedidos_cardapio including defaults);
    create table agendamentos(like pedidos_cardapio including defaults);
    create table reservas_hospedagem(like pedidos_cardapio including defaults);`);
  await db.exec(
    readFileSync(
      new URL("../supabase/migrations/20260911010000_store_web_push.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(`create schema cron; create schema net;
    create function cron.schedule(text,text,text) returns bigint language sql as 'select 1::bigint';
    create table net.calls(id bigserial, url text, headers jsonb);
    create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds int) returns bigint language sql as $$insert into net.calls(url,headers) values($1,$2) returning id$$;`);
  await db.exec(
    readFileSync(
      new URL(
        "../supabase/migrations/20260911020000_store_web_push_scheduler.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
}, 30000);
beforeEach(async () => {
  await db.exec(`reset role; truncate auth.users,minisites,minisite_operadores,pedidos_cardapio,nexa_push_config,net.calls cascade;
    insert into auth.users values('${owner}'),('${other}'); insert into minisites values('${site}','${owner}');`);
});
afterAll(() => db.close());
it("agendador não envia sem configuração; com fila usa só o destino e segredo privados", async () => {
  await subscribe();
  await db.query("insert into pedidos_cardapio(minisite_id) values($1)", [site]);
  await db.query("select nexa_push_wake()");
  expect((await db.query("select * from net.calls")).rows).toHaveLength(0);
  await db.query(
    "select nexa_push_configure('https://nexa.example/api/notifications/push-dispatch','segredo-apenas-teste')",
  );
  await db.query("select nexa_push_wake()");
  expect(
    (await db.query<{ url: string; headers: Record<string, string> }>("select * from net.calls"))
      .rows[0],
  ).toMatchObject({
    url: "https://nexa.example/api/notifications/push-dispatch",
    headers: { Authorization: "Bearer segredo-apenas-teste" },
  });
  await db.exec("set role anon");
  await expect(db.query("select * from nexa_push_config")).rejects.toThrow("permission denied");
});
async function subscribe(user = owner, action = "enable") {
  return db.query<{ active: boolean }>(
    `select nexa_push_subscription($1,$2,'https://fcm.googleapis.com/fake','{}',$3) active`,
    [user, site, action],
  );
}
it("nega inscrição de intruso e acesso direto de usuário comum", async () => {
  await expect(subscribe(other)).rejects.toThrow("not_allowed");
  await db.exec("set role authenticated");
  await expect(subscribe()).rejects.toThrow("permission denied");
  await expect(db.query("select * from nexa_push_devices")).rejects.toThrow("permission denied");
});
it("opt-in é por loja; um evento sem inscrição não gera aviso", async () => {
  await db.query("insert into pedidos_cardapio(minisite_id) values($1)", [site]);
  expect((await db.query("select * from nexa_push_jobs")).rows).toHaveLength(0);
  await subscribe();
  await db.query("insert into pedidos_cardapio(minisite_id) values($1)", [site]);
  expect((await db.query("select * from nexa_push_jobs")).rows).toHaveLength(1);
});
it("fila é criada também para formulário, agenda e reserva", async () => {
  await subscribe();
  for (const table of ["form_submissions", "agendamentos", "reservas_hospedagem"])
    await db.query(`insert into ${table}(minisite_id) values($1)`, [site]);
  expect((await db.query("select * from nexa_push_jobs")).rows).toHaveLength(3);
});
it("desativação remove fila pendente e não cancela outras contas", async () => {
  await subscribe();
  await db.query("insert into pedidos_cardapio(minisite_id) values($1)", [site]);
  expect((await subscribe(owner, "disable")).rows[0].active).toBe(false);
  expect((await db.query("select * from nexa_push_jobs")).rows).toHaveLength(0);
  expect((await db.query("select * from nexa_push_devices")).rows).toHaveLength(0);
});
it("criador que perdeu a propriedade não recebe eventos novos", async () => {
  await subscribe();
  await db.query("update minisites set owner_id=$1", [other]);
  await db.query("insert into pedidos_cardapio(minisite_id) values($1)", [site]);
  expect((await db.query("select * from nexa_push_jobs")).rows).toHaveLength(0);
});
it("claim não entrega o mesmo trabalho duas vezes durante a concessão e encerra tentativas esgotadas", async () => {
  await subscribe();
  await db.query("insert into pedidos_cardapio(minisite_id) values($1)", [site]);
  expect((await db.query("select * from nexa_push_claim()")).rows).toHaveLength(1);
  expect((await db.query("select * from nexa_push_claim()")).rows).toHaveLength(0);
  await db.exec("update nexa_push_jobs set attempts=6,available_at=now()-interval '1 minute'");
  expect((await db.query("select * from nexa_push_claim()")).rows).toHaveLength(0);
  expect(
    (await db.query<{ status: string }>("select status from nexa_push_jobs")).rows[0].status,
  ).toBe("failed");
});
