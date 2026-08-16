import { describe, expect, it } from "vitest";
import {
  filtrarUsuarios,
  mensagemErroAdmin,
  somarSerie,
  type AdminPonto,
  type AdminUsuario,
} from "@/lib/nexa/admin";

const AGORA = new Date("2026-08-16T12:00:00Z").getTime();
const dias = (n: number) => new Date(AGORA - n * 86_400_000).toISOString();

const base = (over: Partial<AdminUsuario>): AdminUsuario => ({
  user_id: "u1",
  email: "pessoa@nexa.com",
  display_name: "Pessoa",
  created_at: dias(100),
  last_active_at: dias(1),
  deletion_scheduled_at: null,
  plano: "free",
  is_admin: false,
  sites: 1,
  sites_publicados: 0,
  solicitacoes: 0,
  papeis: [{ role: "free", created_at: dias(100), updated_at: dias(100) }],
  ...over,
});

const usuarios: AdminUsuario[] = [
  base({ user_id: "a", email: "adm@nexa.com", is_admin: true, plano: "pro", papeis: [
    { role: "admin", created_at: dias(50), updated_at: dias(50) },
    { role: "pro", created_at: dias(50), updated_at: dias(2) },
  ] }),
  base({ user_id: "b", email: "pro@nexa.com", plano: "pro", sites: 3 }),
  base({ user_id: "c", email: "inativo@nexa.com", last_active_at: dias(120), sites: 0 }),
];

describe("filtrarUsuarios", () => {
  it("sem filtros devolve todos", () => {
    expect(filtrarUsuarios(usuarios, {}, AGORA)).toHaveLength(3);
  });

  it("filtra por plano", () => {
    expect(filtrarUsuarios(usuarios, { plano: "pro" }, AGORA).map((u) => u.user_id)).toEqual(["a", "b"]);
    expect(filtrarUsuarios(usuarios, { plano: "free" }, AGORA).map((u) => u.user_id)).toEqual(["c"]);
  });

  it("filtra por papel de administrador", () => {
    expect(filtrarUsuarios(usuarios, { papel: "admin" }, AGORA).map((u) => u.user_id)).toEqual(["a"]);
  });

  it("filtra por atividade nos últimos 30 dias", () => {
    expect(filtrarUsuarios(usuarios, { atividade: "ativos" }, AGORA).map((u) => u.user_id)).toEqual(["a", "b"]);
    expect(filtrarUsuarios(usuarios, { atividade: "inativos" }, AGORA).map((u) => u.user_id)).toEqual(["c"]);
  });

  it("filtra apenas quem tem mini-sites e busca por e-mail", () => {
    expect(filtrarUsuarios(usuarios, { comSites: true }, AGORA)).toHaveLength(2);
    expect(filtrarUsuarios(usuarios, { busca: "ADM@" }, AGORA).map((u) => u.user_id)).toEqual(["a"]);
    expect(filtrarUsuarios(usuarios, { busca: "inexistente" }, AGORA)).toHaveLength(0);
  });

  it("combina filtros", () => {
    const r = filtrarUsuarios(usuarios, { plano: "pro", atividade: "ativos", comSites: true }, AGORA);
    expect(r.map((u) => u.user_id)).toEqual(["a", "b"]);
  });
});

describe("somarSerie", () => {
  it("soma cada métrica do período", () => {
    const serie: AdminPonto[] = [
      { dia: "2026-08-15", usuarios: 1, sites: 2, solicitacoes: 3, visitas: 4 },
      { dia: "2026-08-16", usuarios: 2, sites: 0, solicitacoes: 1, visitas: 6 },
    ];
    expect(somarSerie(serie)).toEqual({ usuarios: 3, sites: 2, solicitacoes: 4, visitas: 10 });
  });

  it("série vazia soma zero", () => {
    expect(somarSerie([])).toEqual({ usuarios: 0, sites: 0, solicitacoes: 0, visitas: 0 });
  });
});

describe("mensagemErroAdmin", () => {
  it("traduz negação de permissão do Postgres", () => {
    expect(mensagemErroAdmin({ message: "admin_required", code: "42501" })).toMatch(/administrador/i);
  });

  it("avisa quando as funções não existem no banco", () => {
    expect(mensagemErroAdmin({ message: "not found", code: "PGRST202" })).toMatch(/funções administrativas/i);
  });

  it("repassa outras mensagens", () => {
    expect(mensagemErroAdmin({ message: "falha de rede" })).toBe("falha de rede");
  });
});
