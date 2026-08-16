import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Archive, Download, Inbox, MessageCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { useNexa } from "@/lib/nexa/hooks";
import { dataHora, tempoRelativo } from "@/lib/nexa/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { EnvioFormulario, Site } from "@/lib/nexa/types";
import { telefoneWhatsApp } from "@/lib/nexa/telefone";

export const Route = createFileRoute("/painel/solicitacoes")({
  head: () => ({
    meta: [
      { title: "Solicitações — Nexa" },
      {
        name: "description",
        content: "Contatos e pedidos recebidos pelos formulários dos mini-sites.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Solicitações — Nexa" },
      { property: "og:description", content: "Caixa de entrada dos formulários dos mini-sites." },
    ],
  }),
  component: PaginaSolicitacoes,
});

const periodos = [
  { id: "todos", rotulo: "Qualquer data", dias: 0 },
  { id: "7", rotulo: "Últimos 7 dias", dias: 7 },
  { id: "30", rotulo: "Últimos 30 dias", dias: 30 },
] as const;

/** Procura um telefone dentro dos campos enviados pelo formulário público. */
function telefoneDoEnvio(dados: Record<string, string>) {
  for (const [chave, valor] of Object.entries(dados)) {
    const digitos = (valor ?? "").replace(/\D/g, "");
    if (/tel|fone|whats|celular/i.test(chave) && digitos.length >= 10) return digitos;
  }
  for (const valor of Object.values(dados)) {
    const digitos = (valor ?? "").replace(/\D/g, "");
    if (digitos.length === 10 || digitos.length === 11) return digitos;
  }
  return "";
}

function resumo(dados: Record<string, string>) {
  const nome = Object.entries(dados).find(([c]) => /nome/i.test(c))?.[1];
  return nome?.trim() || Object.values(dados).find((v) => v?.trim()) || "Sem identificação";
}

function csv(envios: EnvioFormulario[], sites: Site[]) {
  const colunas = new Set<string>();
  for (const e of envios) for (const c of Object.keys(e.dados)) colunas.add(c);
  const cabecalho = ["data", "status", "minisite", ...colunas];
  const escapar = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const linhas = envios.map((e) =>
    [
      dataHora(e.criadoEm),
      e.status,
      sites.find((s) => s.id === e.siteId)?.conteudo.nome ?? e.siteId,
      ...Array.from(colunas).map((c) => e.dados[c] ?? ""),
    ]
      .map(escapar)
      .join(","),
  );
  return [cabecalho.map(escapar).join(","), ...linhas].join("\n");
}

function PaginaSolicitacoes() {
  const { sites, envios, pronto, store } = useNexa();
  const [siteId, setSiteId] = useState("todos");
  const [periodo, setPeriodo] = useState<(typeof periodos)[number]["id"]>("todos");
  const [status, setStatus] = useState<"todos" | EnvioFormulario["status"]>("todos");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const dias = periodos.find((p) => p.id === periodo)?.dias ?? 0;
    const limite = dias ? Date.now() - dias * 86400000 : 0;
    const termo = busca.trim().toLowerCase();
    return envios.filter((e) => {
      if (siteId !== "todos" && e.siteId !== siteId) return false;
      if (status !== "todos" && e.status !== status) return false;
      if (limite && new Date(e.criadoEm).getTime() < limite) return false;
      if (!termo) return true;
      return Object.values(e.dados).some((v) => (v ?? "").toLowerCase().includes(termo));
    });
  }, [busca, envios, periodo, siteId, status]);

  const abrirEnvio = async (envio: EnvioFormulario) => {
    const vaiAbrir = aberto !== envio.id;
    setAberto(vaiAbrir ? envio.id : null);
    if (vaiAbrir && envio.status === "novo") {
      try {
        await store.definirStatusEnvio(envio.id, "lido");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível marcar como lido.");
      }
    }
  };

  const arquivar = async (envio: EnvioFormulario) => {
    try {
      await store.definirStatusEnvio(envio.id, envio.status === "arquivado" ? "lido" : "arquivado");
      toast.success(
        envio.status === "arquivado" ? "Solicitação restaurada." : "Solicitação arquivada.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível alterar a solicitação.",
      );
    }
  };

  const exportar = () => {
    if (filtrados.length === 0) {
      toast.error("Nenhuma solicitação para exportar com os filtros atuais.");
      return;
    }
    const blob = new Blob([`\uFEFF${csv(filtrados, sites)}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `solicitacoes-nexa-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!pronto)
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Solicitações</h1>
          <p className="text-sm text-muted-foreground">
            {envios.length === 0
              ? "Os envios dos formulários públicos aparecem aqui."
              : `${filtrados.length} de ${envios.length} envios recebidos.`}
          </p>
        </div>
        <button
          type="button"
          onClick={exportar}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary"
        >
          <Download size={15} /> Exportar CSV
        </button>
      </div>

      <div className="surface grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-3">
          <Search size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Buscar nas solicitações</span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, e-mail, texto…"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span className="sr-only sm:not-sr-only">Mini-site</span>
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground"
          >
            <option value="todos">Todos os mini-sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.conteudo.nome || s.slug}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span className="sr-only sm:not-sr-only">Status</span>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as "todos" | EnvioFormulario["status"])
            }
            className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground"
          >
            <option value="todos">Todos os status</option>
            <option value="novo">Novos</option>
            <option value="lido">Lidos</option>
            <option value="arquivado">Arquivados</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span className="sr-only sm:not-sr-only">Período</span>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as (typeof periodos)[number]["id"])}
            className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground"
          >
            {periodos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtrados.length === 0 ? (
        <div className="surface flex flex-col items-center gap-2 p-10 text-center">
          <Inbox size={22} className="text-muted-foreground" aria-hidden="true" />
          <p className="font-semibold">Nenhuma solicitação encontrada</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {envios.length === 0
              ? "Quando alguém enviar um formulário em um mini-site publicado, o contato aparece aqui."
              : "Ajuste os filtros para ver outros envios."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtrados.map((e) => {
            const site = sites.find((s) => s.id === e.siteId);
            const telefone = telefoneDoEnvio(e.dados);
            const expandido = aberto === e.id;
            return (
              <li key={e.id} className="surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button
                    type="button"
                    aria-expanded={expandido}
                    onClick={() => void abrirEnvio(e)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate font-semibold">{resumo(e.dados)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {site?.conteudo.nome || site?.slug || "Mini-site removido"} · {e.status} ·{" "}
                      {tempoRelativo(e.criadoEm)} · {dataHora(e.criadoEm)}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    {telefone && (
                      <a
                        href={`https://wa.me/${telefoneWhatsApp(telefone)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-ink-foreground"
                      >
                        <MessageCircle size={15} /> WhatsApp
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => void arquivar(e)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary"
                    >
                      <Archive size={15} aria-hidden="true" />
                      {e.status === "arquivado" ? "Restaurar" : "Arquivar"}
                    </button>
                    {site && (
                      <Link
                        to="/painel/editor/$id"
                        params={{ id: site.id }}
                        className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary"
                      >
                        Abrir site
                      </Link>
                    )}
                  </div>
                </div>

                {expandido && (
                  <dl className="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-2">
                    {Object.entries(e.dados).map(([campo, valor]) => (
                      <div key={campo} className="min-w-0">
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                          {campo}
                        </dt>
                        <dd className="break-words text-sm">{valor || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
