import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { MiniSite } from "@/components/minisite/MiniSite";
import { CatalogoPagina } from "@/components/minisite/CatalogoPagina";
import { ehModeloCardapio } from "@/lib/nexa/cardapio-modelos";
import { carregarMinisiteAdmin, useIsAdmin, type MinisiteAdmin } from "@/lib/nexa/admin";
import {
  MolduraPrevia,
  SeletorDispositivo,
  type Dispositivo,
} from "@/components/editor/PreviaDispositivo";

export const Route = createFileRoute("/painel/admin/site/$id")({
  component: AdminVerSite,
});

type Versao = "rascunho" | "publicado";

function AdminVerSite() {
  const { id } = Route.useParams();
  const { admin, carregando: checando } = useIsAdmin();
  const [disp, setDisp] = useState<Dispositivo>("celular");
  const [versao, setVersao] = useState<Versao>("rascunho");
  const [dados, setDados] = useState<MinisiteAdmin | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!admin) return;
    let ativo = true;
    setCarregando(true);
    setErro(null);
    carregarMinisiteAdmin(id)
      .then((d) => {
        if (!ativo) return;
        setDados(d);
        setVersao(d.publicado ? "publicado" : "rascunho");
        setCarregando(false);
      })
      .catch((e: Error) => {
        if (!ativo) return;
        setErro(e.message);
        setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [id, admin]);

  if (checando) {
    return (
      <p className="surface flex items-center justify-center gap-2 p-6 text-sm" role="status">
        <Loader2 size={15} className="animate-spin" aria-hidden /> Verificando permissões…
      </p>
    );
  }
  if (!admin) return <p className="surface p-6 text-center">Área restrita.</p>;

  const site = dados
    ? versao === "publicado"
      ? (dados.publicado ?? dados.rascunho)
      : dados.rascunho
    : null;

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <Link
            to="/painel/admin"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft size={15} aria-hidden /> Voltar para administração
          </Link>
          <h1 className="truncate font-display text-xl font-bold">
            {dados?.nome ?? "Mini-site do usuário"}
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            /site/{dados?.slug ?? "…"} · somente leitura
          </p>
        </div>
        <SeletorDispositivo valor={disp} onChange={setDisp} />
      </header>

      {dados && (
        <div role="group" aria-label="Versão exibida" className="flex flex-wrap gap-2">
          {(["rascunho", "publicado"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={versao === v}
              disabled={v === "publicado" && !dados.publicado}
              onClick={() => setVersao(v)}
              className={`min-h-11 rounded-full border px-4 text-sm font-medium disabled:opacity-40 ${
                versao === v ? "border-ink bg-ink text-ink-foreground" : "border-border bg-card"
              }`}
            >
              {v === "rascunho" ? "Rascunho" : "Publicado"}
            </button>
          ))}
        </div>
      )}

      <div className="surface flex h-[70vh] min-h-[420px] flex-col overflow-hidden">
        {carregando ? (
          <p className="m-auto flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 size={15} className="animate-spin" aria-hidden /> Carregando mini-site…
          </p>
        ) : erro ? (
          <p role="alert" className="m-auto max-w-sm px-4 text-center text-sm text-destructive">
            {erro}
          </p>
        ) : site ? (
          <MolduraPrevia dispositivo={disp}>
            {ehModeloCardapio(site.modeloId) ? (
              <CatalogoPagina site={site} interacoesExternas={false} mostrarVoltar={false} />
            ) : (
              <MiniSite site={site} botaoFlutuante={false} interacoesExternas={false} />
            )}
          </MolduraPrevia>
        ) : null}
      </div>
    </div>
  );
}
