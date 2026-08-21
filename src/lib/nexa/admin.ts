import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PapelNexa = "admin";
export type PlanoNexa = "pro" | "free";

export type AdminResumo = {
  usuarios: number;
  usuarios_ativos_30d: number;
  sites: number;
  sites_publicados: number;
  clientes: number;
  solicitacoes: number;
  solicitacoes_30d: number;
  visitas_30d: number;
  planos: Record<string, number>;
};

export type PapelRegistro = { role: PapelNexa; created_at: string; updated_at: string };

export type AdminUsuario = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  last_active_at: string;
  deletion_scheduled_at: string | null;
  plano: PlanoNexa;
  plan_updated_at: string;
  plan_changed_by: string | null;
  is_admin: boolean;
  sites: number;
  sites_publicados: number;
  solicitacoes: number;
  papeis: PapelRegistro[];
};

export type AdminAuditoria = {
  id: number;
  actor_user_id: string | null;
  actor_email: string | null;
  target_user_id: string | null;
  target_email: string | null;
  action: "plan_changed";
  previous_value: string | null;
  new_value: string | null;
  created_at: string;
};

export type AdminPonto = {
  dia: string;
  usuarios: number;
  sites: number;
  solicitacoes: number;
  visitas: number;
};

export type AdminUsoIA = {
  user_id: string;
  email: string | null;
  tier: string;
  subscription_status: string;
  generations_7d: number;
  generations_period: number;
  tokens_7d: number;
  tokens_period: number;
  estimated_cost_brl_period: number;
  last_generation_at: string | null;
};

export type AdminFinanceiro = {
  revenue_received_brl: number;
  revenue_pending_brl: number;
  revenue_overdue_brl: number;
  active_subscriptions: number;
  paid_invoices: number;
  ai_tokens: number;
  ai_generations: number;
  ai_estimated_cost_brl: number;
};

export const PERIODOS = [7, 30, 90] as const;
export type Periodo = (typeof PERIODOS)[number];

export type FiltroUsuarios = {
  busca?: string;
  plano?: "todos" | "pro" | "free";
  papel?: "todos" | PapelNexa;
  atividade?: "todos" | "ativos" | "inativos";
  comSites?: boolean;
};

const DIA = 86_400_000;

/** Filtro puro usado pela tela e coberto por testes. */
export function filtrarUsuarios(
  usuarios: AdminUsuario[],
  filtro: FiltroUsuarios,
  agora: number = Date.now(),
): AdminUsuario[] {
  const termo = (filtro.busca ?? "").trim().toLowerCase();
  return usuarios.filter((u) => {
    if (filtro.plano && filtro.plano !== "todos" && u.plano !== filtro.plano) return false;
    if (filtro.papel && filtro.papel !== "todos") {
      if (!u.is_admin) return false;
    }
    if (filtro.atividade && filtro.atividade !== "todos") {
      const ativo = agora - new Date(u.last_active_at).getTime() <= 30 * DIA;
      if (filtro.atividade === "ativos" && !ativo) return false;
      if (filtro.atividade === "inativos" && ativo) return false;
    }
    if (filtro.comSites && u.sites === 0) return false;
    if (termo) {
      const alvo = [u.email, u.display_name, u.user_id].filter(Boolean).join(" ").toLowerCase();
      if (!alvo.includes(termo)) return false;
    }
    return true;
  });
}

/** Totais de uma série já filtrada por período. */
export function somarSerie(serie: AdminPonto[]) {
  return serie.reduce(
    (acc, p) => ({
      usuarios: acc.usuarios + p.usuarios,
      sites: acc.sites + p.sites,
      solicitacoes: acc.solicitacoes + p.solicitacoes,
      visitas: acc.visitas + p.visitas,
    }),
    { usuarios: 0, sites: 0, solicitacoes: 0, visitas: 0 },
  );
}

export function mensagemErroAdmin(error: { message: string; code?: string }) {
  if (error.code === "42501") return "Esta conta não tem permissão de administrador.";
  if (error.code === "PGRST202") return "O banco ainda não recebeu as funções administrativas.";
  return error.message;
}

/** Indica se a conta autenticada tem papel de administrador. */
export function useIsAdmin() {
  const [admin, setAdmin] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    const checar = async () => {
      const { data: sessao } = await supabase.auth.getUser();
      const id = sessao.user?.id;
      if (!id) {
        if (ativo) {
          setAdmin(false);
          setCarregando(false);
        }
        return;
      }
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", id)
        .eq("role", "admin")
        .maybeSingle();
      if (!ativo) return;
      setAdmin(!error && Boolean(data));
      setCarregando(false);
    };

    void checar();
    const { data: listener } = supabase.auth.onAuthStateChange(() => void checar());
    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { admin, carregando };
}

/** Carrega resumo, usuários e série histórica (somente administradores). */
export function useAdminDados(periodo: Periodo = 30) {
  const [resumo, setResumo] = useState<AdminResumo | null>(null);
  const [usuarios, setUsuarios] = useState<AdminUsuario[]>([]);
  const [serie, setSerie] = useState<AdminPonto[]>([]);
  const [auditoria, setAuditoria] = useState<AdminAuditoria[]>([]);
  const [usoIa, setUsoIa] = useState<AdminUsoIA[]>([]);
  const [financeiro, setFinanceiro] = useState<AdminFinanceiro | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    const [r1, r2, r3, r4, r5, r6] = await Promise.all([
      supabase.rpc("nexa_admin_overview"),
      supabase.rpc("nexa_admin_users"),
      supabase.rpc("nexa_admin_series", { requested_days: periodo }),
      supabase.rpc("nexa_admin_audit", { requested_limit: 100 }),
      supabase.rpc("nexa_admin_ai_usage", { requested_days: periodo }),
      supabase.rpc("nexa_admin_finance", { requested_days: periodo }),
    ]);
    const falha = r1.error ?? r2.error ?? r3.error ?? r4.error ?? r5.error ?? r6.error;
    if (falha) {
      setErro(mensagemErroAdmin(falha));
      setCarregando(false);
      return;
    }
    setResumo(r1.data as unknown as AdminResumo);
    setUsuarios((r2.data ?? []) as unknown as AdminUsuario[]);
    setSerie((r3.data ?? []) as unknown as AdminPonto[]);
    setAuditoria((r4.data ?? []) as unknown as AdminAuditoria[]);
    setUsoIa((r5.data ?? []) as unknown as AdminUsoIA[]);
    setFinanceiro((r6.data?.[0] ?? null) as unknown as AdminFinanceiro | null);
    setCarregando(false);
  }, [periodo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const definirPlano = useCallback(
    async (userId: string, plano: PlanoNexa) => {
      const { error } = await supabase.rpc("nexa_admin_set_plan", {
        requested_user_id: userId,
        requested_plan: plano,
      });
      if (error) throw new Error(mensagemErroAdmin(error));
      await carregar();
    },
    [carregar],
  );
  const definirAssinatura = useCallback(
    async (userId: string, tier: string, status: string) => {
      const { error } = await supabase.rpc("nexa_admin_set_subscription", {
        requested_user_id: userId,
        requested_tier: tier,
        requested_status: status,
      });
      if (error) throw new Error(mensagemErroAdmin(error));
      await carregar();
    },
    [carregar],
  );

  return {
    resumo,
    usuarios,
    serie,
    auditoria,
    usoIa,
    financeiro,
    carregando,
    erro,
    recarregar: carregar,
    definirPlano,
    definirAssinatura,
  };
}

export type AdminProjeto = {
  id: string;
  slug: string;
  nome: string;
  status: string;
  criado_em: string;
  atualizado_em: string;
  publicado_em: string | null;
  solicitacoes: number;
};

type ConteudoBruto = { conteudo?: { nome?: string }; cliente?: { empresa?: string } } | null;

const nomeDe = (bruto: unknown) => {
  const c = bruto as ConteudoBruto;
  return c?.conteudo?.nome?.trim() || c?.cliente?.empresa?.trim() || "";
};

/**
 * O rascunho é a versão mais recente editada pelo dono; o conteúdo publicado
 * serve apenas como alternativa quando o rascunho ainda não tem nome.
 */
export const nomeDoProjeto = (draft: unknown, publicado: unknown, slug: string) =>
  nomeDe(draft) || nomeDe(publicado) || slug;

export type LinhaMinisite = {
  id: string;
  slug: string;
  status: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  draft_content: unknown;
  published_content: unknown;
};

/** Junta mini-sites e contagem de solicitações — puro, coberto por testes. */
export function mapearProjetos(
  sites: LinhaMinisite[],
  envios: { minisite_id: string }[],
): AdminProjeto[] {
  const porSite = new Map<string, number>();
  for (const e of envios) porSite.set(e.minisite_id, (porSite.get(e.minisite_id) ?? 0) + 1);
  return sites.map((s) => ({
    id: s.id,
    slug: s.slug,
    nome: nomeDoProjeto(s.draft_content, s.published_content, s.slug),
    status: s.status,
    criado_em: s.created_at,
    atualizado_em: s.updated_at,
    publicado_em: s.published_at,
    solicitacoes: porSite.get(s.id) ?? 0,
  }));
}

export type EstadoProjetos = {
  carregando: boolean;
  erro: string | null;
  itens: AdminProjeto[];
};

/** Traduz o estado bruto da consulta em um dos quatro estados da interface. */
export function descreverEstadoProjetos(
  estado: EstadoProjetos,
): "carregando" | "erro" | "vazio" | "lista" {
  if (estado.carregando) return "carregando";
  if (estado.erro) return "erro";
  if (estado.itens.length === 0) return "vazio";
  return "lista";
}

/**
 * Lê os mini-sites de um usuário específico (permitido pela política de leitura
 * administrativa já existente) com a contagem real de solicitações de cada um.
 */
export async function carregarProjetosUsuario(userId: string): Promise<AdminProjeto[]> {
  const { data, error } = await supabase
    .from("minisites")
    .select(
      "id, slug, status, created_at, updated_at, published_at, draft_content, published_content",
    )
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(mensagemErroAdmin(error));

  const sites = data ?? [];
  if (sites.length === 0) return [];

  const { data: envios, error: erroEnvios } = await supabase
    .from("form_submissions")
    .select("minisite_id")
    .in(
      "minisite_id",
      sites.map((s) => s.id),
    );
  if (erroEnvios) throw new Error(mensagemErroAdmin(erroEnvios));

  return mapearProjetos(sites as unknown as LinhaMinisite[], envios ?? []);
}
