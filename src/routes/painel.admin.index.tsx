import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  ChevronDown,
  Crown,
  ExternalLink,
  Download,
  Globe,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { GraficoArea, GraficoBarras } from "@/components/Graficos";
import {
  PERIODOS,
  filtrarUsuarios,
  somarSerie,
  useAdminDados,
  carregarProjetosUsuario,
  descreverEstadoProjetos,
  useIsAdmin,
  type EstadoProjetos,
  type AdminUsuario,
  type Periodo,
} from "@/lib/nexa/admin";
import { baixarCsv, montarCsv, nomeArquivoCsv } from "@/lib/nexa/csv";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/painel/admin/")({
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
  v
    ? new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const rotuloDia = (dia: string) =>
  new Date(`${dia}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

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
    <div className="rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {rotulo}
        </p>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary">
          <Icone size={15} className="text-muted-foreground" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold leading-none tabular-nums">{valor}</p>
      {detalhe && <p className="mt-2 text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  );
}

const CHIP_STATUS: Record<string, string> = {
  publicado: "bg-lime text-ink",
  rascunho: "border border-border text-muted-foreground",
  pausado: "bg-secondary text-foreground",
};

function ProjetosDoUsuario({ userId, email }: { userId: string; email: string }) {
  const [estado, setEstado] = useState<EstadoProjetos>({
    carregando: true,
    erro: null,
    itens: [],
  });

  useEffect(() => {
    let ativo = true;
    setEstado({ carregando: true, erro: null, itens: [] });
    carregarProjetosUsuario(userId)
      .then((itens) => ativo && setEstado({ carregando: false, erro: null, itens }))
      .catch((e: Error) => ativo && setEstado({ carregando: false, erro: e.message, itens: [] }));
    return () => {
      ativo = false;
    };
  }, [userId]);

  const situacao = descreverEstadoProjetos(estado);

  if (situacao === "carregando") {
    return (
      <p className="flex items-center gap-2 px-1 py-3 text-xs text-muted-foreground" role="status">
        <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Carregando projetos de{" "}
        {email}…
      </p>
    );
  }
  if (situacao === "erro") {
    return (
      <p role="alert" className="px-1 py-3 text-xs text-destructive">
        {estado.erro}
      </p>
    );
  }
  if (situacao === "vazio") {
    return (
      <p className="px-1 py-3 text-xs text-muted-foreground">
        Esta conta ainda não criou nenhum mini-site.
      </p>
    );
  }

  return (
    <ul className="grid gap-2 pt-3 sm:grid-cols-2">
      {estado.itens.map((p) => (
        <li key={p.id} className="min-w-0 rounded-xl border border-border bg-background p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-semibold">{p.nome}</p>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                CHIP_STATUS[p.status] ?? "border border-border text-muted-foreground"
              }`}
            >
              {p.status}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">/site/{p.slug}</p>
          <p className="mt-1 break-words text-xs text-muted-foreground">
            {p.solicitacoes} solicitação(ões) · criado {dataCurta(p.criado_em)} · atualizado{" "}
            {dataCurta(p.atualizado_em)}
            {p.publicado_em ? ` · publicado ${dataCurta(p.publicado_em)}` : ""}
          </p>
          {p.status === "publicado" && (
            <Link
              to="/site/$slug"
              params={{ slug: p.slug }}
              className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold hover:bg-secondary"
            >
              <ExternalLink size={12} aria-hidden="true" /> Ver mini-site
            </Link>
          )}
        </li>
      ))}
    </ul>
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
  const [aberto, setAberto] = useState(false);
  const identificacao = u.email ?? u.user_id;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
          <p className="truncate text-xs text-muted-foreground">
            {u.email ?? "e-mail indisponível"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {u.sites} site(s) · {u.sites_publicados} publicado(s) · {u.solicitacoes}{" "}
            solicitação(ões) · cadastro {dataCurta(u.created_at)} · ativo{" "}
            {dataCurta(u.last_active_at)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:shrink-0">
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold hover:bg-secondary"
          >
            <ChevronDown
              size={14}
              className={`transition-transform ${aberto ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
            {aberto ? "Ocultar projetos" : "Ver projetos"}
          </button>

          <div
            className="flex shrink-0 items-center gap-1 rounded-full border border-border p-1"
            role="group"
            aria-label={`Plano de ${identificacao}`}
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
                  className={`inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors disabled:cursor-default ${
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
      </div>

      {aberto && (
        <div className="mt-3 border-t border-border pt-1">
          <ProjetosDoUsuario userId={u.user_id} email={identificacao} />
        </div>
      )}
    </div>
  );
}

function PainelAdmin() {
  const { admin, carregando: checando } = useIsAdmin();
  const [periodo, setPeriodo] = useState<Periodo>(30);
  const { resumo, usuarios, serie, carregando, erro, recarregar, definirPlano } =
    useAdminDados(periodo);
  const [busca, setBusca] = useState("");
  const [plano, setPlano] = useState<"todos" | "pro" | "free">("todos");
  const [atividade, setAtividade] = useState<"todos" | "ativos" | "inativos">("todos");
  const [comSites, setComSites] = useState(false);
  const [alterando, setAlterando] = useState<string | null>(null);
  const [baixandoEnvios, setBaixandoEnvios] = useState(false);

  const lista = useMemo(
    () => filtrarUsuarios(usuarios, { busca, plano, atividade, comSites }),
    [atividade, busca, comSites, plano, usuarios],
  );
  const totais = useMemo(() => somarSerie(serie), [serie]);

  const trocarPlano = async (u: AdminUsuario, novo: "pro" | "free") => {
    setAlterando(u.user_id);
    try {
      await definirPlano(u.user_id, novo);
      toast.success(
        `Plano de ${u.email ?? "usuário"} atualizado para ${novo === "pro" ? "Pro" : "Gratuito"}.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível alterar o plano.");
    } finally {
      setAlterando(null);
    }
  };

  const exportarUsuarios = () => {
    baixarCsv(
      nomeArquivoCsv("usuarios-nexa"),
      montarCsv(lista, [
        { cabecalho: "E-mail", valor: (u) => u.email },
        { cabecalho: "Nome", valor: (u) => u.display_name },
        { cabecalho: "Plano", valor: (u) => u.plano },
        { cabecalho: "Administrador", valor: (u) => (u.is_admin ? "sim" : "não") },
        { cabecalho: "Mini-sites", valor: (u) => u.sites },
        { cabecalho: "Publicados", valor: (u) => u.sites_publicados },
        { cabecalho: "Solicitações", valor: (u) => u.solicitacoes },
        { cabecalho: "Cadastro", valor: (u) => dataCurta(u.created_at) },
        { cabecalho: "Último acesso", valor: (u) => dataCurta(u.last_active_at) },
      ]),
    );
    toast.success(`${lista.length} usuário(s) exportado(s).`);
  };

  const exportarMetricas = () => {
    baixarCsv(
      nomeArquivoCsv(`metricas-nexa-${periodo}d`),
      montarCsv(serie, [
        { cabecalho: "Dia", valor: (p) => p.dia },
        { cabecalho: "Novos usuários", valor: (p) => p.usuarios },
        { cabecalho: "Mini-sites criados", valor: (p) => p.sites },
        { cabecalho: "Solicitações", valor: (p) => p.solicitacoes },
        { cabecalho: "Visitas", valor: (p) => p.visitas },
      ]),
    );
    toast.success("Métricas do período exportadas.");
  };

  const exportarSolicitacoes = async () => {
    setBaixandoEnvios(true);
    const desde = new Date(Date.now() - periodo * 86_400_000).toISOString();
    const { data, error } = await supabase
      .from("form_submissions")
      .select("id, created_at, origin, status, payload, minisite_id")
      .gte("created_at", desde)
      .order("created_at", { ascending: false })
      .limit(1000);
    setBaixandoEnvios(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    const linhas = data ?? [];
    if (linhas.length === 0) {
      toast.info("Nenhuma solicitação no período selecionado.");
      return;
    }
    baixarCsv(
      nomeArquivoCsv(`solicitacoes-nexa-${periodo}d`),
      montarCsv(linhas, [
        { cabecalho: "Data", valor: (l) => new Date(l.created_at).toLocaleString("pt-BR") },
        { cabecalho: "Mini-site", valor: (l) => l.minisite_id },
        { cabecalho: "Origem", valor: (l) => l.origin },
        { cabecalho: "Status", valor: (l) => l.status },
        { cabecalho: "Conteúdo", valor: (l) => JSON.stringify(l.payload) },
      ]),
    );
    toast.success(`${linhas.length} solicitação(ões) exportada(s).`);
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
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/painel/admin/papeis"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary"
          >
            <ShieldCheck size={15} aria-hidden="true" /> Planos e auditoria
          </Link>
          <button
            type="button"
            onClick={() => void recarregar()}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary"
          >
            <RefreshCw size={15} className={carregando ? "animate-spin" : ""} aria-hidden="true" />
            Atualizar
          </button>
        </div>
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

      <section className="rounded-2xl border border-border bg-card p-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold">Evolução por período</h2>
            <p className="text-xs text-muted-foreground">
              {totais.usuarios} novos usuários · {totais.sites} mini-sites · {totais.solicitacoes}{" "}
              solicitações · {totais.visitas} visitas nos últimos {periodo} dias
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex items-center gap-1 rounded-full border border-border p-1"
              role="group"
              aria-label="Período das métricas"
            >
              {PERIODOS.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={periodo === p}
                  onClick={() => setPeriodo(p)}
                  className={`min-h-11 rounded-full px-3 text-xs font-semibold ${
                    periodo === p
                      ? "bg-ink text-ink-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {p} dias
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={exportarMetricas}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-3 text-xs font-semibold hover:bg-secondary"
            >
              <Download size={13} aria-hidden="true" /> Métricas CSV
            </button>
            <button
              type="button"
              onClick={() => void exportarSolicitacoes()}
              disabled={baixandoEnvios}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-3 text-xs font-semibold hover:bg-secondary disabled:opacity-60"
            >
              {baixandoEnvios ? (
                <Loader2 size={13} className="animate-spin" aria-hidden="true" />
              ) : (
                <Download size={13} aria-hidden="true" />
              )}
              Solicitações CSV
            </button>
          </div>
        </header>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="h-40">
            <GraficoArea
              ariaLabel={`Visitas por dia nos últimos ${periodo} dias`}
              dados={serie.map((p) => ({ rotulo: rotuloDia(p.dia), valor: p.visitas }))}
            />
            <p className="mt-1 text-xs text-muted-foreground">Visitas aos mini-sites</p>
          </div>
          <div className="h-40">
            <GraficoBarras
              ariaLabel={`Solicitações por dia nos últimos ${periodo} dias`}
              dados={serie
                .slice(-14)
                .map((p) => ({ rotulo: rotuloDia(p.dia), valor: p.solicitacoes }))}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Solicitações recebidas (14 dias finais)
            </p>
          </div>
          <div className="h-40">
            <GraficoArea
              ariaLabel={`Novos usuários por dia nos últimos ${periodo} dias`}
              dados={serie.map((p) => ({ rotulo: rotuloDia(p.dia), valor: p.usuarios }))}
            />
            <p className="mt-1 text-xs text-muted-foreground">Novos cadastros</p>
          </div>
          <div className="h-40">
            <GraficoArea
              ariaLabel={`Mini-sites criados por dia nos últimos ${periodo} dias`}
              dados={serie.map((p) => ({ rotulo: rotuloDia(p.dia), valor: p.sites }))}
            />
            <p className="mt-1 text-xs text-muted-foreground">Mini-sites criados</p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
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
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1 rounded-full border border-border p-1"
            role="group"
            aria-label="Filtrar por plano"
          >
            {(["todos", "pro", "free"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={plano === f}
                onClick={() => setPlano(f)}
                className={`min-h-11 rounded-full px-3 text-xs font-semibold ${
                  plano === f
                    ? "bg-ink text-ink-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {f === "todos" ? "Todos" : f === "pro" ? "Pro" : "Gratuitos"}
              </button>
            ))}
          </div>
          <div
            className="flex items-center gap-1 rounded-full border border-border p-1"
            role="group"
            aria-label="Filtrar por atividade"
          >
            {(["todos", "ativos", "inativos"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={atividade === f}
                onClick={() => setAtividade(f)}
                className={`min-h-11 rounded-full px-3 text-xs font-semibold ${
                  atividade === f
                    ? "bg-ink text-ink-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {f === "todos" ? "Qualquer" : f === "ativos" ? "Ativos 30d" : "Inativos"}
              </button>
            ))}
          </div>
          <label className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-3 text-xs font-semibold">
            <input
              type="checkbox"
              checked={comSites}
              onChange={(e) => setComSites(e.target.checked)}
              className="h-4 w-4 accent-current"
            />
            Com mini-sites
          </label>
          <button
            type="button"
            onClick={exportarUsuarios}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-3 text-xs font-semibold hover:bg-secondary"
          >
            <Download size={13} aria-hidden="true" /> Usuários CSV
          </button>
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
