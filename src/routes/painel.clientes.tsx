import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Copy,
  ExternalLink,
  LayoutGrid,
  MoreHorizontal,
  Pause,
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

import { segmentos, nomeSegmento } from "@/lib/nexa/segmentos";
import { numero, tempoRelativo, uid } from "@/lib/nexa/utils";
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

  const copiar = (s: Site) => {
    void navigator.clipboard?.writeText(`https://${host}/${s.slug}`);
    toast.success("Endereço copiado!");
  };

  const duplicar = async (s: Site) => {
    await store.adicionarSite({
      ...s,
      id: uid("site"),
      slug: `${s.slug}-copia`,
      status: "rascunho",
      conteudo: { ...s.conteudo, nome: `${s.conteudo.nome} (cópia)` },
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    });
    toast.success("Mini-site duplicado");
  };

  const alternar = async (s: Site) => {
    const novo = s.status === "publicado" ? "pausado" : "publicado";
    await store.atualizarSite(s.id, { status: novo });
    toast.success(novo === "publicado" ? "Mini-site publicado" : "Mini-site pausado");
  };

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
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary">
            <Upload size={13} /> Importar JSON
            <input
              type="file"
              accept="application/json,.json,.nexa"
              className="hidden"
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
                  toast.success("Projeto importado", { description: `/site/${novo.slug}` });
                } catch (err) {
                  toast.error("Não foi possível importar", {
                    description: err instanceof Error ? err.message : "Arquivo inválido.",
                  });
                }
              }}
            />
          </label>
          <div className="flex rounded-full border border-border p-1">
            <button
              type="button"
              aria-label="Tabela"
              onClick={() => setVisual("tabela")}
              className={`grid h-8 w-8 place-items-center rounded-full ${visual === "tabela" ? "bg-ink text-ink-foreground" : ""}`}
            >
              <Rows3 size={15} />
            </button>
            <button
              type="button"
              aria-label="Cards"
              onClick={() => setVisual("cards")}
              className={`grid h-8 w-8 place-items-center rounded-full ${visual === "cards" ? "bg-ink text-ink-foreground" : ""}`}
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>

      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou endereço"
          className="w-full rounded-full border border-input bg-card px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring sm:w-72"
        />
        <select
          value={seg}
          onChange={(e) => setSeg(e.target.value)}
          className="rounded-full border border-input bg-card px-4 py-2 text-sm"
        >
          <option value="todos">Todos os segmentos</option>
          {segmentos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-full border border-input bg-card px-4 py-2 text-sm"
        >
          <option value="todos">Todos os status</option>
          <option value="publicado">Publicado</option>
          <option value="rascunho">Rascunho</option>
          <option value="pausado">Pausado</option>
        </select>
      </div>

      {lista.length === 0 && (
        <div className="surface p-10 text-center">
          <p className="font-display text-lg font-bold">Nenhum cliente encontrado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajuste os filtros ou crie um novo mini-site.
          </p>
          <Link
            to="/painel/novo"
            className="mt-5 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-ink-foreground"
          >
            Criar mini-site
          </Link>
        </div>
      )}

      {visual === "tabela" && lista.length > 0 && (
        <div className="surface overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4">Empresa</th>
                <th className="p-4">Segmento</th>
                <th className="p-4">Endereço</th>
                <th className="p-4">Status</th>
                <th className="p-4">Visitas</th>
                <th className="p-4">Atualizado</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((s) => (
                <tr key={s.id} className="hover:bg-secondary/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime/25 text-xs font-bold">
                        {s.conteudo.nome.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="font-medium">{s.conteudo.nome}</span>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{nomeSegmento(s.cliente.segmento)}</td>
                  <td className="p-4 text-muted-foreground">
                    {host}/{s.slug}
                  </td>
                  <td className="p-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cores[s.status]}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="p-4">{numero(s.metricas.visitas)}</td>
                  <td className="p-4 text-muted-foreground">{tempoRelativo(s.atualizadoEm)}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      <Link
                        to="/painel/editor/$id"
                        params={{ id: s.id }}
                        aria-label="Editar"
                        className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"
                      >
                        <Pencil size={14} />
                      </Link>
                      <Link
                        to="/site/$slug"
                        params={{ slug: s.slug }}
                        aria-label="Visualizar"
                        className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"
                      >
                        <ExternalLink size={14} />
                      </Link>
                      <button
                        type="button"
                        aria-label="Copiar endereço"
                        onClick={() => copiar(s)}
                        className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label="QR Code"
                        onClick={() => setQr(s)}
                        className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"
                      >
                        <QrCode size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label="Duplicar"
                        onClick={() => void duplicar(s)}
                        className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={s.status === "publicado" ? "Pausar" : "Publicar"}
                        onClick={() => void alternar(s)}
                        className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"
                      >
                        {s.status === "publicado" ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      <button
                        type="button"
                        aria-label="Excluir"
                        onClick={() => setExcluir(s)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {visual === "cards" && lista.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((s) => (
            <div key={s.id} className="surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-lime/25 text-xs font-bold">
                    {s.conteudo.nome.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{s.conteudo.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {nomeSegmento(s.cliente.segmento)} · {s.cliente.cidade}
                    </p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${cores[s.status]}`}>
                  {s.status}
                </span>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                {host}/{s.slug} · {numero(s.metricas.visitas)} visitas
              </p>
              <div className="mt-4 flex gap-2">
                <Link
                  to="/painel/editor/$id"
                  params={{ id: s.id }}
                  className="flex-1 rounded-full bg-ink px-3 py-2 text-center text-xs font-semibold text-ink-foreground"
                >
                  Editar
                </Link>
                <Link
                  to="/site/$slug"
                  params={{ slug: s.slug }}
                  className="flex-1 rounded-full border border-border px-3 py-2 text-center text-xs font-semibold"
                >
                  Visualizar
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {qr && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-ink/60 p-5"
          onClick={() => setQr(null)}
        >
          <div className="rounded-3xl bg-card p-7 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-lg font-bold">{qr.conteudo.nome}</p>
            <div className="mt-4 rounded-2xl bg-white p-4">
              <QRCodeSVG value={`https://${host}/${qr.slug}`} size={180} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {host}/{qr.slug}
            </p>
          </div>
        </div>
      )}

      {excluir && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/60 p-5">
          <div className="w-full max-w-sm rounded-3xl bg-card p-7">
            <p className="font-display text-lg font-bold">Excluir mini-site?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {excluir.conteudo.nome} será removido permanentemente.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setExcluir(null)}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  void store.removerSite(excluir.id);
                  setExcluir(null);
                  toast.success("Mini-site excluído");
                }}
                className="rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground"
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
