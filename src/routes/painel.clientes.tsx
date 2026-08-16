import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  CheckCircle2,
  CircleDashed,
  Copy,
  ExternalLink,
  LayoutGrid,
  Files,
  Pause,
  PauseCircle,
  Pencil,
  Play,
  QrCode,
  Rows3,
  Trash2,
  Upload,
} from "lucide-react";
import { duplicarImportacao, lerArquivo } from "@/lib/nexa/exportar";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useMarca, useNexa } from "@/lib/nexa/hooks";
import { hostMarca } from "@/lib/nexa/marca";
import { caminhoSite, copiarTexto, enderecoSite } from "@/lib/nexa/clipboard";

import { segmentos, nomeSegmento } from "@/lib/nexa/segmentos";
import { numero, tempoRelativo } from "@/lib/nexa/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { Site } from "@/lib/nexa/types";

export const Route = createFileRoute("/painel/clientes")({
  component: Clientes,
});

const cores: Record<Site["status"], string> = {
  publicado: "bg-lime/25 text-ink",
  rascunho: "bg-secondary text-muted-foreground",
  pausado: "bg-ember/20 text-ember",
};

const icones: Record<Site["status"], typeof CheckCircle2> = {
  publicado: CheckCircle2,
  rascunho: CircleDashed,
  pausado: PauseCircle,
};

function Selo({ status }: { status: Site["status"] }) {
  const Icone = icones[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cores[status]}`}
    >
      <Icone size={12} aria-hidden="true" />
      {status}
    </span>
  );
}

function Clientes() {
  const marca = useMarca();
  const host = hostMarca(marca);
  const { sites, pronto, store } = useNexa();
  const [busca, setBusca] = useState("");
  const [seg, setSeg] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [visual, setVisual] = useState<"tabela" | "cards">("tabela");
  const [qr, setQr] = useState<Site | null>(null);
  const [excluir, setExcluir] = useState<Site | null>(null);

  const lista = sites.filter(
    (s) =>
      (seg === "todos" || s.cliente.segmento === seg) &&
      (status === "todos" || s.status === status) &&
      (s.conteudo.nome.toLowerCase().includes(busca.toLowerCase()) ||
        s.slug.includes(busca.toLowerCase())),
  );

  const copiar = async (s: Site) => {
    const ok = await copiarTexto(enderecoSite(host, s.slug));
    if (ok) toast.success("Endereço copiado", { description: caminhoSite(s.slug) });
    else
      toast.error("Não foi possível copiar", {
        description: "O navegador bloqueou o acesso à área de transferência.",
      });
  };

  const duplicar = async (s: Site) => {
    try {
      const copia = duplicarImportacao(
        s,
        sites.map((site) => site.slug),
      );
      copia.conteudo.nome = `${s.conteudo.nome} (cópia)`;
      await store.adicionarSite(copia);
      toast.success("Mini-site duplicado");
    } catch (error) {
      toast.error("Não foi possível duplicar", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const alternar = async (s: Site) => {
    const novo = s.status === "publicado" ? "pausado" : "publicado";
    try {
      if (novo === "publicado") await store.publicarSite(s);
      else await store.definirStatus(s, "pausado");
      toast.success(novo === "publicado" ? "Mini-site publicado" : "Mini-site pausado");
    } catch (error) {
      toast.error("Não foi possível alterar o status", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  /** Ações completas de um mini-site — mesmas em tabela e cards. */
  const Acoes = ({ s, compacto = false }: { s: Site; compacto?: boolean }) => {
    const base = compacto
      ? "grid h-11 w-11 place-items-center rounded-lg hover:bg-secondary"
      : "grid h-9 w-9 place-items-center rounded-lg hover:bg-secondary";
    return (
      <>
        <Link
          to="/painel/editor/$id"
          params={{ id: s.id }}
          aria-label={`Editar ${s.conteudo.nome}`}
          title="Editar"
          className={base}
        >
          <Pencil size={15} />
        </Link>
        <Link
          to="/site/$slug"
          params={{ slug: s.slug }}
          aria-label={`Visualizar ${s.conteudo.nome}`}
          title="Visualizar"
          className={base}
        >
          <ExternalLink size={15} />
        </Link>
        <button
          type="button"
          aria-label={`Copiar endereço de ${s.conteudo.nome}`}
          title="Copiar endereço"
          onClick={() => void copiar(s)}
          className={base}
        >
          <Copy size={15} />
        </button>
        <button
          type="button"
          aria-label={`QR Code de ${s.conteudo.nome}`}
          title="QR Code"
          onClick={() => setQr(s)}
          className={base}
        >
          <QrCode size={15} />
        </button>
        <button
          type="button"
          aria-label={`Duplicar ${s.conteudo.nome}`}
          title="Duplicar"
          onClick={() => void duplicar(s)}
          className={base}
        >
          <Files size={15} />
        </button>
        <button
          type="button"
          aria-label={
            s.status === "publicado" ? `Pausar ${s.conteudo.nome}` : `Publicar ${s.conteudo.nome}`
          }
          title={s.status === "publicado" ? "Pausar" : "Publicar"}
          onClick={() => void alternar(s)}
          className={base}
        >
          {s.status === "publicado" ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button
          type="button"
          aria-label={`Excluir ${s.conteudo.nome}`}
          title="Excluir"
          onClick={() => setExcluir(s)}
          className={`${base} text-destructive hover:bg-destructive/10`}
        >
          <Trash2 size={15} />
        </button>
      </>
    );
  };

  const Cartao = ({ s }: { s: Site }) => (
    <div className="surface min-w-0 p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <Link
          to="/painel/editor/$id"
          params={{ id: s.id }}
          className="flex min-w-0 items-center gap-3 rounded-xl text-left"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-lime/25 text-xs font-bold">
            {s.conteudo.nome.slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{s.conteudo.nome}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {nomeSegmento(s.cliente.segmento)} · {s.cliente.cidade}
            </span>
          </span>
        </Link>
        <Selo status={s.status} />
      </div>
      <p className="mt-4 break-all text-xs text-muted-foreground">
        {caminhoSite(s.slug)} · {numero(s.metricas.visitas)} visitas ·{" "}
        {tempoRelativo(s.atualizadoEm)}
      </p>
      <div className="mt-4 flex gap-2">
        <Link
          to="/painel/editor/$id"
          params={{ id: s.id }}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-ink px-3 text-center text-xs font-semibold text-ink-foreground"
        >
          Editar
        </Link>
        <Link
          to="/site/$slug"
          params={{ slug: s.slug }}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-border px-3 text-center text-xs font-semibold"
        >
          Visualizar
        </Link>
      </div>
      <div className="mt-2 flex flex-wrap justify-end gap-1 border-t border-border pt-2">
        <Acoes s={s} compacto />
      </div>
    </div>
  );

  if (!pronto)
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">{lista.length} registros</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold hover:bg-secondary">
            <Upload size={13} aria-hidden="true" />{" "}
            <span className="hidden sm:inline">Importar JSON</span>
            <span className="sr-only sm:hidden">Importar JSON</span>
            <input
              type="file"
              accept="application/json,.json,.nexa"
              className="sr-only"
              onChange={async (e) => {
                const arquivo = e.target.files?.[0];
                e.target.value = "";
                if (!arquivo) return;
                try {
                  const importado = lerArquivo(await arquivo.text());
                  const novo = duplicarImportacao(
                    importado,
                    sites.map((s) => s.slug),
                  );
                  await store.adicionarSite(novo);
                  toast.success("Projeto importado", { description: caminhoSite(novo.slug) });
                } catch (err) {
                  toast.error("Não foi possível importar", {
                    description: err instanceof Error ? err.message : "Arquivo inválido.",
                  });
                }
              }}
            />
          </label>
          <div className="hidden rounded-full border border-border p-1 md:flex">
            <button
              type="button"
              aria-label="Ver em tabela"
              aria-pressed={visual === "tabela"}
              onClick={() => setVisual("tabela")}
              className={`grid h-9 w-9 place-items-center rounded-full ${visual === "tabela" ? "bg-ink text-ink-foreground" : ""}`}
            >
              <Rows3 size={15} />
            </button>
            <button
              type="button"
              aria-label="Ver em cards"
              aria-pressed={visual === "cards"}
              onClick={() => setVisual("cards")}
              className={`grid h-9 w-9 place-items-center rounded-full ${visual === "cards" ? "bg-ink text-ink-foreground" : ""}`}
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="w-full sm:w-72">
          <span className="sr-only">Buscar por nome ou endereço</span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou endereço"
            className="min-h-11 w-full rounded-full border border-input bg-card px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label>
          <span className="sr-only">Filtrar por segmento</span>
          <select
            value={seg}
            onChange={(e) => setSeg(e.target.value)}
            className="min-h-11 rounded-full border border-input bg-card px-4 text-sm"
          >
            <option value="todos">Todos os segmentos</option>
            {segmentos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filtrar por status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="min-h-11 rounded-full border border-input bg-card px-4 text-sm"
          >
            <option value="todos">Todos os status</option>
            <option value="publicado">Publicado</option>
            <option value="rascunho">Rascunho</option>
            <option value="pausado">Pausado</option>
          </select>
        </label>
      </div>

      {lista.length === 0 && (
        <div className="surface p-10 text-center">
          <p className="font-display text-lg font-bold">
            {sites.length === 0 ? "Nenhum cliente cadastrado" : "Nenhum cliente encontrado"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {sites.length === 0
              ? "Crie o primeiro mini-site para começar."
              : "Ajuste os filtros ou crie um novo mini-site."}
          </p>
          <Link
            to="/painel/novo"
            className="mt-5 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-ink-foreground"
          >
            Criar mini-site
          </Link>
        </div>
      )}

      {/* Celular: sempre cards, nunca tabela espremida. */}
      {lista.length > 0 && (
        <div
          className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${visual === "tabela" ? "md:hidden" : ""}`}
        >
          {lista.map((s) => (
            <Cartao key={s.id} s={s} />
          ))}
        </div>
      )}

      {visual === "tabela" && lista.length > 0 && (
        <div className="surface hidden overflow-x-auto md:block">
          <table className="w-full min-w-[860px] text-sm">
            <caption className="sr-only">Mini-sites dos clientes</caption>
            <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="p-4 text-left">
                  Empresa
                </th>
                <th scope="col" className="p-4 text-left">
                  Segmento
                </th>
                <th scope="col" className="p-4 text-left">
                  Endereço
                </th>
                <th scope="col" className="p-4 text-left">
                  Status
                </th>
                <th scope="col" className="p-4 text-left">
                  Visitas
                </th>
                <th scope="col" className="p-4 text-left">
                  Atualizado
                </th>
                <th scope="col" className="p-4 text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((s) => (
                <tr key={s.id} className="hover:bg-secondary/50">
                  <td className="p-4">
                    <Link
                      to="/painel/editor/$id"
                      params={{ id: s.id }}
                      className="flex items-center gap-3 rounded-lg"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime/25 text-xs font-bold">
                        {s.conteudo.nome.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="font-medium underline-offset-4 hover:underline">
                        {s.conteudo.nome}
                      </span>
                    </Link>
                  </td>
                  <td className="p-4 text-muted-foreground">{nomeSegmento(s.cliente.segmento)}</td>
                  <td className="p-4 text-muted-foreground">{caminhoSite(s.slug)}</td>
                  <td className="p-4">
                    <Selo status={s.status} />
                  </td>
                  <td className="p-4">{numero(s.metricas.visitas)}</td>
                  <td className="p-4 text-muted-foreground">{tempoRelativo(s.atualizadoEm)}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      <Acoes s={s} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {qr && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-ink/60 p-5"
          role="dialog"
          aria-modal="true"
          aria-label={`QR Code de ${qr.conteudo.nome}`}
          onClick={() => setQr(null)}
          onKeyDown={(e) => e.key === "Escape" && setQr(null)}
        >
          <div
            className="w-full max-w-xs rounded-3xl bg-card p-7 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-lg font-bold">{qr.conteudo.nome}</p>
            <div className="mt-4 grid place-items-center rounded-2xl bg-white p-4">
              <QRCodeSVG value={enderecoSite(host, qr.slug)} size={168} />
            </div>
            <p className="mt-3 break-all text-xs text-muted-foreground">
              {host}
              {caminhoSite(qr.slug)}
            </p>
            <button
              type="button"
              onClick={() => setQr(null)}
              className="mt-5 min-h-11 w-full rounded-full border border-border px-4 text-sm font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {excluir && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-ink/60 p-5"
          role="alertdialog"
          aria-modal="true"
          aria-label="Confirmar exclusão"
          onKeyDown={(e) => e.key === "Escape" && setExcluir(null)}
        >
          <div className="w-full max-w-sm rounded-3xl bg-card p-7">
            <p className="font-display text-lg font-bold">Excluir mini-site?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {excluir.conteudo.nome} será removido permanentemente. Esta ação não pode ser
              desfeita.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setExcluir(null)}
                className="min-h-11 rounded-full border border-border px-4 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await store.removerSite(excluir.id);
                    setExcluir(null);
                    toast.success("Mini-site excluído");
                  } catch (error) {
                    toast.error("Não foi possível excluir", {
                      description: error instanceof Error ? error.message : undefined,
                    });
                  }
                }}
                className="min-h-11 rounded-full bg-destructive px-4 text-sm font-semibold text-destructive-foreground"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
