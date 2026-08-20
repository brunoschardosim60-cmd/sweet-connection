import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, Loader2, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  filtrarUsuarios,
  useAdminDados,
  useIsAdmin,
  type AdminUsuario,
  type PlanoNexa,
} from "@/lib/nexa/admin";
import { baixarCsv, montarCsv, nomeArquivoCsv } from "@/lib/nexa/csv";

export const Route = createFileRoute("/painel/admin/papeis")({
  head: () => ({
    meta: [
      { title: "Planos e auditoria — Nexa" },
      {
        name: "description",
        content: "Gerencie planos comerciais e consulte o histórico administrativo da Nexa.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PainelAcessos,
});

const dataHora = (valor?: string | null) =>
  valor
    ? new Date(valor).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

function CartaoAcesso({
  usuario,
  ocupado,
  onPlano,
}: {
  usuario: AdminUsuario;
  ocupado: boolean;
  onPlano: (plano: string) => void;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">
            {usuario.display_name?.trim() || usuario.email || usuario.user_id}
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            {usuario.email ?? "E-mail indisponível"}
          </p>
        </div>
        {usuario.is_admin && (
          <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-1 text-[11px] font-semibold text-ink-foreground">
            <ShieldCheck size={12} aria-hidden="true" /> Administrador fixo
          </span>
        )}
      </header>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
        <div>
          <p className="text-xs font-semibold">Plano comercial</p>
          <p className="text-[11px] text-muted-foreground">
            Última alteração: {dataHora(usuario.plan_updated_at)}
          </p>
        </div>
        <div className="flex rounded-full border border-border p-1" role="group" aria-label="Plano">
          {["none", "essential", "professional", "catalog"].map((plano) => (
            <button
              key={plano}
              type="button"
              disabled={ocupado}
              onClick={() => onPlano(plano)}
              className={`min-h-11 rounded-full px-3 text-xs font-semibold disabled:cursor-default ${"text-muted-foreground hover:bg-secondary disabled:opacity-60"}`}
            >
              {
                {
                  none: "Sem plano",
                  essential: "Essencial",
                  professional: "Profissional",
                  catalog: "Catálogo",
                }[plano]
              }
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}

function PainelAcessos() {
  const { admin, carregando: checando } = useIsAdmin();
  const { usuarios, auditoria, carregando, erro, definirAssinatura } = useAdminDados(30);
  const [busca, setBusca] = useState("");
  const [plano, setPlano] = useState<"todos" | PlanoNexa>("todos");
  const [ocupado, setOcupado] = useState<string | null>(null);

  const lista = useMemo(
    () => filtrarUsuarios(usuarios, { busca, plano }),
    [busca, plano, usuarios],
  );

  const alterarPlano = async (usuario: AdminUsuario, proximo: string) => {
    setOcupado(usuario.user_id);
    try {
      await definirAssinatura(usuario.user_id, proximo, proximo === "none" ? "inactive" : "active");
      toast.success(`Plano de ${usuario.email ?? "usuário"} atualizado.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar o plano.");
    } finally {
      setOcupado(null);
    }
  };

  const exportar = () => {
    baixarCsv(
      nomeArquivoCsv("planos-e-auditoria-nexa"),
      montarCsv(auditoria, [
        { cabecalho: "Data", valor: (item) => dataHora(item.created_at) },
        { cabecalho: "Administrador", valor: (item) => item.actor_email },
        { cabecalho: "Conta alterada", valor: (item) => item.target_email },
        { cabecalho: "Plano anterior", valor: (item) => item.previous_value },
        { cabecalho: "Novo plano", valor: (item) => item.new_value },
      ]),
    );
  };

  if (checando || (carregando && usuarios.length === 0 && !erro)) {
    return (
      <div className="grid min-h-[50vh] place-items-center" role="status">
        <Loader2 className="animate-spin" aria-hidden="true" />
        <span className="sr-only">Carregando planos…</span>
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
    <section className="space-y-5">
      <Link
        to="/painel/admin"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={15} aria-hidden="true" /> Voltar para a administração
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Planos e auditoria</h1>
          <p className="text-sm text-muted-foreground">
            Defina o acesso comercial de cada conta. Sem plano, a pessoa só pode manter um rascunho
            e não publica.
          </p>
        </div>
        <button
          type="button"
          onClick={exportar}
          disabled={auditoria.length === 0}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
        >
          Exportar histórico
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-card px-3 py-2">
          <Search size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Buscar contas por nome ou e-mail</span>
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome ou e-mail"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <select
          value={plano}
          onChange={(event) => setPlano(event.target.value as "todos" | PlanoNexa)}
          aria-label="Filtrar por plano"
          className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm"
        >
          <option value="todos">Todos os planos</option>
          <option value="free">Gratuito</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      <div className="space-y-3">
        {lista.map((usuario) => (
          <CartaoAcesso
            key={usuario.user_id}
            usuario={usuario}
            ocupado={ocupado === usuario.user_id}
            onPlano={(proximo) => void alterarPlano(usuario, proximo)}
          />
        ))}
        {lista.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma conta encontrada com esses filtros.
          </p>
        )}
      </div>

      <section className="space-y-3" aria-labelledby="titulo-auditoria">
        <h2 id="titulo-auditoria" className="text-lg font-bold">
          Histórico de alterações
        </h2>
        {auditoria.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Nenhuma alteração de plano registrada ainda.
          </p>
        ) : (
          <ul className="space-y-2">
            {auditoria.map((item) => (
              <li key={item.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
                <p className="font-semibold">{item.target_email ?? "Conta removida"}</p>
                <p className="text-muted-foreground">
                  {item.previous_value ?? "—"} → {item.new_value ?? "—"} ·{" "}
                  {dataHora(item.created_at)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Alterado por {item.actor_email ?? "administrador removido"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
