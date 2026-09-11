import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { it, expect } from "vitest";
it("saúde distingue canal ignorado, falha e aceitação de push, restrita a admin", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;
   create function auth.uid() returns uuid language sql as $$select null::uuid$$;
   create function has_role(uuid,text) returns boolean language sql as $$select coalesce(current_setting('test.admin',true),'false')='true'$$;
   create table notification_deliveries(status text,created_at timestamptz default now());
   create table nexa_push_jobs(status text,created_at timestamptz default now());
   create table billing_invoices(status text);create table profiles(admin_suspended_at timestamptz);
   create table form_submissions(created_at timestamptz default now());create table pedidos_cardapio(created_at timestamptz default now());
   insert into notification_deliveries(status) values('skipped'),('failed');insert into nexa_push_jobs(status) values('pending'),('failed'),('sent');`);
    await db.exec(
      readFileSync(
        new URL("../supabase/migrations/20260911030000_web_push_admin_health.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec("set role authenticated");
    await expect(db.query("select nexa_admin_health()")).rejects.toThrow("admin_required");
    await db.exec("select set_config('test.admin','true',false)");
    const result = await db.query<{ r: Record<string, number> }>("select nexa_admin_health() r");
    expect(result.rows[0].r).toMatchObject({
      notification_failures_7d: 1,
      notifications_skipped_7d: 1,
      push_pending: 1,
      push_failed_7d: 1,
      push_sent_24h: 1,
    });
  } finally {
    await db.close();
  }
}, 30000);
