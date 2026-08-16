import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, Crown, Loader2, Search, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import {
  filtrarUsuarios,
  useAdminDados,
  useIsAdmin,
  type AdminUsuario,
  type PapelNexa,
} from "@/lib/nexa/admin";
import { baixarCsv, montarCsv, nomeArquivoCsv } from "@/lib/nexa/csv";

export const Route = createFileRoute("/painel/admin/papeis")({
  head: () => ({
    meta: [
      { title: "Papéis de acesso — Nexa" },
      {
        name: "description",
        content: "Conceda ou remova papéis de administrador, Pro e gratuito das contas da Nexa.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Papéis de acesso — Nexa" },
      { property: "og:description", content: "Gestão de papéis das contas da plataforma Nexa." },
    ],
  }),
  component: PainelPapeis,
});

const PAPEIS: { chave: PapelNexa; rotulo: string; icone: typeof User }[] = [
  { chave: "admin", rotulo: "Administrador", icone: ShieldCheck },
  { chave: "pro", rotulo: "Pro", icone: Crown },
  { chave: "free", rotulo: "Gratuito", icone: User },
];

const dataHora = (v?: string | null) =>
  v
    ? new Date(v).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

function CartaoPapeis({
  u,
  ocupado,
  onAlternar,
}: {
  u: AdminUsuario;
  ocupado: PapelNexa | null;
  onAlternar: (papel: PapelNexa, ativo: boolean) => void;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <header className="min-w-0">
        <h2 className="truncate text-sm font-semibold">
          {u.display_name?.trim() || u.email || u.user_id}
        </h2>
        <p className="truncate text-xs text-muted-foreground">{u.email ?? "e-mail indisponível"}</p>
      </header>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {PAPEIS.map(({ chave, rotulo, icone: Icone }) => {
          const registro = u.papeis?.find((p) => p.role === chave);
          const ativo = Boolean(registro);
          return (
            <div key={chave} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  <Icone size={13} aria-hidden="true" /> {rotulo}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={ativo}
                  aria-label={`${ativo ? "Remover" : "Conceder"} papel ${rotulo} de ${u.email ?? u.user_id}`}
                  disabled={ocupado === chave}
                  onClick={() => onAlternar(chave, !ativo)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                    ativo ? "bg-lime" : "bg-secondary"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-all ${
                      ativo ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-tight text-muted-foreground">
                {ativo ? (
                  <>
                    Concedido em {dataHora(registro?.created_at)}
                    <br />
                    Última alteração: {dataHora(registro?.updated_at)}
                  </>
                ) : (
                  "Sem este papel"
                )}
              </p>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function PainelPapeis() {
  const { admin, carregando: checando } = useIsAdmin();
  const { usuarios, carregando, erro, definirPapel } = useAdminDados(30);
  const [busca, setBusca] = useState("");
  const [papelFiltro, setPapelFiltro] = useState<"todos" | PapelNexa>("todos");
  const [ocupado, setOcupado] = useState<string | null>(null);

  const lista = useMemo(
    () => filtrarUsuarios(usuarios, { busca, papel: papelFiltro }),
    [busca, papelFiltro, usuarios],
  );

  const alternar = async (u: AdminUsuario, papel: PapelNexa, ativo: boolean) => {
    setOcupado(`${u.user_id}:${papel}`);
    try {
      await definirPapel(u.user_id, papel, ativo);
      toast.success(`Papel ${papel} ${ativo ? "concedido a" : "removido de"} ${u.email ?? "usuário"}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível alterar o papel.");
    } finally {
      setOcupado(null);
    }
  };

  const exportar = () => {
    const linhas = lista.flatMap((u) =>
      (u.papeis ?? []).map((p) => ({ u, p })),
    );
    baixarCsv(
      nomeArquivoCsv("papeis-nexa"),
      montarCsv(linhas, [
        { cabecalho: "E-mail", valor: (l) => l.u.email },
        { cabecalho: "Nome", valor: (l) => l.u.display_name },
        { cabecalho: "Papel", valor: (l) => l.p.role },
        { cabecalho: "Concedido em", valor: (l) => dataHora(l.p.created_at) },
        { cabecalho: "Última alteração", valor: (l) => dataHora(l.p.updated_at) },
      ]),
    );
  };

  if (checando || (carregando && usuarios.length === 0 && !erro)) {
    return (
      <div className="grid min-h-[50vh] place-items-center" role="status">
        <Loader2 className="animate-spin" aria-hidden="true" />
        <span className="sr-only">Carregando papéis…</span>
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
          <h1 className="text-xl font-bold sm:text-2xl">Papéis de acesso</h1>
          <p className="text-sm text-muted-foreground">
            Conceda ou remova papéis e acompanhe quando cada mudança foi feita.
          </p>
        </div>
        <button
          type="button"
          onClick={exportar}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary"
        >
          Exportar CSV
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
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou e-mail"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <div className="flex items-center gap-1 rounded-full border border-border p-1" role="group" aria-label="Filtrar por papel">
          {(["todos", "admin", "pro", "free"] as const).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={papelFiltro === p}
              onClick={() => setPapelFiltro(p)}
              className={`min-h-9 rounded-full px-3 text-xs font-semibold ${
                papelFiltro === p ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {p === "todos" ? "Todos" : p === "admin" ? "Admin" : p === "pro" ? "Pro" : "Gratuito"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {lista.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma conta encontrada com esses filtros.
          </p>
        ) : (
          lista.map((u) => (
            <CartaoPapeis
              key={u.user_id}
              u={u}
              ocupado={
                ocupado?.startsWith(`${u.user_id}:`)
                  ? (ocupado.split(":")[1] as PapelNexa)
                  : null
              }
              onAlternar={(papel, ativo) => void alternar(u, papel, ativo)}
            />
          ))
        )}
      </div>
    </section>
  );
}
