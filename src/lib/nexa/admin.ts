import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export type AdminUsuario = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  last_active_at: string;
  deletion_scheduled_at: string | null;
  plano: string;
  is_admin: boolean;
  sites: number;
  sites_publicados: number;
  solicitacoes: number;
};

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

function mensagem(error: { message: string; code?: string }) {
  if (error.code === "42501") return "Esta conta não tem permissão de administrador.";
  if (error.code === "PGRST202") return "O banco ainda não recebeu as funções administrativas.";
  return error.message;
}

/** Carrega resumo da plataforma e lista de usuários (somente administradores). */
export function useAdminDados() {
  const [resumo, setResumo] = useState<AdminResumo | null>(null);
  const [usuarios, setUsuarios] = useState<AdminUsuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    const [r1, r2] = await Promise.all([
      supabase.rpc("nexa_admin_overview"),
      supabase.rpc("nexa_admin_users"),
    ]);
    if (r1.error || r2.error) {
      setErro(mensagem(r1.error ?? r2.error!));
      setCarregando(false);
      return;
    }
    setResumo(r1.data as unknown as AdminResumo);
    setUsuarios((r2.data ?? []) as unknown as AdminUsuario[]);
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const definirPlano = useCallback(
    async (userId: string, plano: "pro" | "free") => {
      const { error } = await supabase.rpc("nexa_admin_set_plan", {
        requested_user_id: userId,
        requested_plan: plano,
      });
      if (error) throw new Error(mensagem(error));
      setUsuarios((atual) =>
        atual.map((u) => (u.user_id === userId ? { ...u, plano } : u)),
      );
    },
    [],
  );

  return { resumo, usuarios, carregando, erro, recarregar: carregar, definirPlano };
}
