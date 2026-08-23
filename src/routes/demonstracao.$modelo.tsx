import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { MiniSite } from "@/components/minisite/MiniSite";
import { CatalogoPagina } from "@/components/minisite/CatalogoPagina";
import { ehModeloCardapio } from "@/lib/nexa/cardapio-modelos";
import { siteDoModelo } from "@/lib/nexa/demo-modelos";
import { modelos } from "@/lib/nexa/modelos";
import {
  MolduraPrevia,
  SeletorDispositivo,
  type Dispositivo,
} from "@/components/editor/PreviaDispositivo";

export const Route = createFileRoute("/demonstracao/$modelo")({
  loader: ({ params }) => {
    const modelo = modelos.find((m) => m.id === params.modelo);
    if (!modelo) throw notFound();
    return { nome: modelo.nome, descricao: modelo.descricao };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.nome} — demonstração Nexa` },
          { name: "description", content: loaderData.descricao },
          { property: "og:title", content: `${loaderData.nome} — demonstração Nexa` },
          { property: "og:description", content: loaderData.descricao },
        ]
      : [{ title: "Modelo não encontrado — Nexa" }, { name: "robots", content: "noindex" }],
  }),
  component: Demonstracao,
});

function Demonstracao() {
  const { modelo } = Route.useParams();
  const [disp, setDisp] = useState<Dispositivo>("celular");
  const site = siteDoModelo(modelo);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-sand">
      <header className="z-40 grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-xl sm:flex sm:justify-between">
        <Link
          to="/modelos"
          className="inline-flex min-h-11 min-w-0 items-center gap-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <ArrowLeft size={16} /> <span className="truncate">Voltar aos modelos</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <SeletorDispositivo valor={disp} onChange={setDisp} />
          <Link
            to="/painel/novo"
            search={{ modelo }}
            className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-semibold text-ink-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Usar este modelo
          </Link>
        </div>
      </header>

      <main
        data-dispositivo={disp}
        className="relative flex min-h-0 flex-1 justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_42%,rgba(166,241,83,0.16),transparent_37%)] p-3 sm:p-5"
      >
        <section
          aria-label="Prévia interativa do modelo"
          className="relative flex min-h-0 w-full max-w-6xl flex-1 overflow-hidden rounded-[2rem] border border-border/80 bg-background/45 shadow-[0_20px_70px_rgba(24,20,13,0.08)]"
        >
          <div className="pointer-events-none absolute left-6 top-6 z-10 hidden max-w-48 lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Prévia interativa
            </p>
            <p className="mt-1 text-sm leading-snug text-foreground/75">
              Explore o modelo como ele aparece para os clientes.
            </p>
          </div>
          <MolduraPrevia dispositivo={disp} className="bg-transparent">
            {ehModeloCardapio(site.modeloId) ? (
              <CatalogoPagina
                site={site}
                interacoesExternas={false}
                mostrarVoltar={false}
                mostrarCarrinhoFlutuante={false}
              />
            ) : (
              <MiniSite site={site} botaoFlutuante={false} interacoesExternas={false} />
            )}
          </MolduraPrevia>
        </section>
      </main>
    </div>
  );
}
