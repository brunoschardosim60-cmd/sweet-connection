import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Crown,
  Globe,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminDados, useIsAdmin, type AdminUsuario } from "@/lib/nexa/admin";

export const Route = createFileRoute("/painel/admin")({
  head: () => ({
    meta: [
      { title: "Administração — Nexa" },
      {
        name: "description",
        content: "Visão administrativa da plataforma Nexa: usuários, planos, sites e solicitações.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Administração — Nexa" },
      { property: "og:description", content: "Painel restrito de administração da Nexa." },
    ],
  }),
  component: PainelAdmin,
});

const dataCurta = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function Cartao({
  rotulo,
  valor,
  detalhe,
  icone: Icone,
}: {
  rotulo: string;
  valor: number | string;
  detalhe?: string;
  icone: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{rotulo}</p>
        <Icone size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{valor}</p>
      {detalhe && <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  );
}

function LinhaUsuario({
  u,
  alterando,
  onPlano,
}: {
  u: AdminUsuario;
  alterando: boolean;
  onPlano: (plano: "pro" | "free") => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <span className="truncate">{u.display_name?.trim() || u.email || "Sem nome"}</span>
          {u.is_admin && (
            <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-ink-foreground">
              <ShieldCheck size={11} aria-hidden="true" /> admin
            </span>
          )}
          {u.deletion_scheduled_at && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              exclusão agendada
            </span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">{u.email ?? "e-mail indisponível"}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {u.sites} site(s) · {u.sites_publicados} publicado(s) · {u.solicitacoes} solicitação(ões) ·
          cadastro {dataCurta(u.created_at)} · ativo {dataCurta(u.last_active_at)}
        </p>
      </div>

      <div
        className="flex shrink-0 items-center gap-1 rounded-full border border-border p-1"
        role="group"
        aria-label={`Plano de ${u.email ?? u.user_id}`}
      >
        {(["free", "pro"] as const).map((p) => {
          const ativo = u.plano === p;
          return (
            <button
              key={p}
              type="button"
              disabled={alterando || ativo}
              aria-pressed={ativo}
              onClick={() => onPlano(p)}
              className={`inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors disabled:cursor-default ${
                ativo ? "bg-lime text-ink" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {p === "pro" && <Crown size={12} aria-hidden="true" />}
              {p === "pro" ? "Pro" : "Gratuito"}
            </button>
          );
        })}
        {alterando && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      </div>
    </div>
  );
}

function PainelAdmin() {
  const { admin, carregando: checando } = useIsAdmin();
  const { resumo, usuarios, carregando, erro, recarregar, definirPlano } = useAdminDados();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "pro" | "free">("todos");
  const [alterando, setAlterando] = useState<string | null>(null);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return usuarios
      .filter((u) => (filtro === "todos" ? true : u.plano === filtro))
      .filter((u) =>
        termo
          ? [u.email, u.display_name].some((v) => (v ?? "").toLowerCase().includes(termo))
          : true,
      );
  }, [busca, filtro, usuarios]);

  const trocarPlano = async (u: AdminUsuario, plano: "pro" | "free") => {
    setAlterando(u.user_id);
    try {
      await definirPlano(u.user_id, plano);
      toast.success(`Plano de ${u.email ?? "usuário"} atualizado para ${plano === "pro" ? "Pro" : "Gratuito"}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível alterar o plano.");
    } finally {
      setAlterando(null);
    }
  };

  if (checando || (carregando && !resumo && !erro)) {
    return (
      <div className="grid min-h-[50vh] place-items-center" role="status">
        <Loader2 className="animate-spin" aria-hidden="true" />
        <span className="sr-only">Carregando administração…</span>
      </div>
    );
  }

  if (!admin) {
    return (
      <section className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-6 text-center">
        <ShieldCheck className="mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-lg font-bold">Área restrita</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta conta não tem permissão de administrador da plataforma.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Administração da plataforma</h1>
          <p className="text-sm text-muted-foreground">
            Dados reais de todas as contas, mini-sites e solicitações da Nexa.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void recarregar()}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary"
        >
          <RefreshCw size={15} className={carregando ? "animate-spin" : ""} aria-hidden="true" />
          Atualizar
        </button>
      </header>

      {erro && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {erro}
        </p>
      )}

      {resumo && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Cartao
            rotulo="Usuários"
            valor={resumo.usuarios}
            detalhe={`${resumo.usuarios_ativos_30d} ativos em 30 dias`}
            icone={Users}
          />
          <Cartao
            rotulo="Mini-sites"
            valor={resumo.sites}
            detalhe={`${resumo.sites_publicados} publicados`}
            icone={Globe}
          />
          <Cartao
            rotulo="Solicitações"
            valor={resumo.solicitacoes}
            detalhe={`${resumo.solicitacoes_30d} nos últimos 30 dias`}
            icone={Inbox}
          />
          <Cartao
            rotulo="Visitas (30 dias)"
            valor={resumo.visitas_30d}
            detalhe={`${resumo.planos?.["pro"] ?? 0} contas Pro · ${resumo.planos?.["free"] ?? 0} gratuitas`}
            icone={BarChart3}
          />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-card px-3 py-2">
          <Search size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Buscar usuários por nome ou e-mail</span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou e-mail"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <div className="flex items-center gap-1 rounded-full border border-border p-1" role="group" aria-label="Filtrar por plano">
          {(["todos", "pro", "free"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filtro === f}
              onClick={() => setFiltro(f)}
              className={`min-h-9 rounded-full px-3 text-xs font-semibold ${
                filtro === f ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {f === "todos" ? "Todos" : f === "pro" ? "Pro" : "Gratuitos"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {lista.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum usuário encontrado com esses filtros.
          </p>
        ) : (
          lista.map((u) => (
            <LinhaUsuario
              key={u.user_id}
              u={u}
              alterando={alterando === u.user_id}
              onPlano={(p) => void trocarPlano(u, p)}
            />
          ))
        )}
      </div>
    </section>
  );
}
