import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("limite persistente de ajustes da IA em PostgreSQL isolado", () => {
  const db = new PGlite();
  const owner = "00000000-0000-4000-8000-000000000001";
  const outroOwner = "00000000-0000-4000-8000-000000000002";
  const sessao = "10000000-0000-4000-8000-000000000001";
  const outraSessao = "10000000-0000-4000-8000-000000000002";
  const chave = `ia-ajuste:${owner}:${sessao}`;

  beforeAll(async () => {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;
      create schema auth;
      create function auth.role() returns text language sql as
        $$select nullif(current_setting('request.jwt.claim.role', true), '')$$;
      create table public.cotacoes_limites (
        chave text primary key,
        janela timestamptz not null,
        quantidade integer not null
      );
      alter table public.cotacoes_limites enable row level security;
      revoke all on public.cotacoes_limites from public, anon, authenticated;
      grant all on public.cotacoes_limites to service_role;
    `);
    await db.exec(
      readFileSync(
        new URL("../supabase/migrations/20260910010000_ai_refinement_budget.sql", import.meta.url),
        "utf8",
      ),
    );
  }, 30000);

  beforeEach(async () => {
    await db.exec(`
      reset role;
      truncate public.cotacoes_limites;
      select set_config('request.jwt.claim.role', 'service_role', false);
      set role service_role;
    `);
  });

  afterAll(async () => {
    await db.close();
  });

  async function consumir(key = chave) {
    return (
      await db.query<{ permitido: boolean }>(
        "select public.nexa_limite_ajuste_ia($1) as permitido",
        [key],
      )
    ).rows[0].permitido;
  }

  it("permite três ajustes e recusa o quarto, inclusive em chamadas posteriores", async () => {
    expect(await consumir()).toBe(true);
    expect(await consumir()).toBe(true);
    expect(await consumir()).toBe(true);
    expect(await consumir()).toBe(false);
    expect(await consumir()).toBe(false);
    await db.exec("reset role");
    const registros = await db.query<{ quantidade: number }>(
      "select quantidade from public.cotacoes_limites where chave = $1",
      [chave],
    );
    expect(registros.rows).toEqual([{ quantidade: 5 }]);
  });

  it("mantém a contagem independente para outro proprietário ou outra sessão", async () => {
    for (let i = 0; i < 3; i++) expect(await consumir()).toBe(true);
    expect(await consumir()).toBe(false);
    for (const outraChave of [
      `ia-ajuste:${outroOwner}:${sessao}`,
      `ia-ajuste:${owner}:${outraSessao}`,
    ]) {
      for (let i = 0; i < 3; i++) expect(await consumir(outraChave)).toBe(true);
      expect(await consumir(outraChave)).toBe(false);
    }
    expect(await consumir()).toBe(false);
  });

  it("não reinicia o limite ao atravessar uma janela de calendário", async () => {
    for (let i = 0; i < 3; i++) await consumir();
    await db.exec("reset role");
    const { rows } = await db.query<{ janela: Date }>(
      `update public.cotacoes_limites set janela = now() - interval '1 day'
       where chave = $1 returning janela`,
      [chave],
    );
    await db.exec("set role service_role");
    expect(await consumir()).toBe(false);
    await db.exec("reset role");
    const depois = await db.query<{ janela: Date; quantidade: number }>(
      "select janela, quantidade from public.cotacoes_limites where chave = $1",
      [chave],
    );
    expect(depois.rows).toEqual([{ janela: rows[0].janela, quantidade: 4 }]);
  });

  it.each(["anon", "authenticated"])("não permite execução direta por %s", async (role) => {
    await db.exec(`reset role; set role ${role}`);
    await expect(consumir()).rejects.toThrow(
      "permission denied for function nexa_limite_ajuste_ia",
    );
  });

  it("verifica a função de servidor e o namespace antes de consumir a cota", async () => {
    await db.exec(
      `reset role; select set_config('request.jwt.claim.role', 'authenticated', false)`,
    );
    await expect(consumir()).rejects.toThrow("not_allowed");
    await db.exec(`select set_config('request.jwt.claim.role', 'service_role', false)`);
    await expect(consumir("outro-limite:teste")).rejects.toThrow("not_allowed");
    await expect(consumir(`ia-ajuste:${"a".repeat(121)}`)).rejects.toThrow("not_allowed");
    const { rows } = await db.query<{ total: number }>(
      "select count(*)::integer as total from public.cotacoes_limites",
    );
    expect(rows[0].total).toBe(0);
  });
});
