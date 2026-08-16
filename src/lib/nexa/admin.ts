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
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    const [r1, r2, r3, r4] = await Promise.all([
      supabase.rpc("nexa_admin_overview"),
      supabase.rpc("nexa_admin_users"),
      supabase.rpc("nexa_admin_series", { requested_days: periodo }),
      supabase.rpc("nexa_admin_audit", { requested_limit: 100 }),
    ]);
    const falha = r1.error ?? r2.error ?? r3.error ?? r4.error;
    if (falha) {
      setErro(mensagemErroAdmin(falha));
      setCarregando(false);
      return;
    }
    setResumo(r1.data as unknown as AdminResumo);
    setUsuarios((r2.data ?? []) as unknown as AdminUsuario[]);
    setSerie((r3.data ?? []) as unknown as AdminPonto[]);
    setAuditoria((r4.data ?? []) as unknown as AdminAuditoria[]);
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

  return {
    resumo,
    usuarios,
    serie,
    auditoria,
    carregando,
    erro,
    recarregar: carregar,
    definirPlano,
  };
}
