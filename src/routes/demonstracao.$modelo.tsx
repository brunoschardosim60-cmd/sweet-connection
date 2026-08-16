import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Monitor, Smartphone, Tablet } from "lucide-react";
import { useState } from "react";
import { MiniSite } from "@/components/minisite/MiniSite";
import { siteDoModelo } from "@/lib/nexa/demo-modelos";
import { modelos } from "@/lib/nexa/modelos";

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

const larguras = { celular: 390, tablet: 768, computador: 1100 };

function Demonstracao() {
  const { modelo } = Route.useParams();
  const [disp, setDisp] = useState<keyof typeof larguras>("celular");
  const site = siteDoModelo(modelo);

  return (
    <div className="min-h-screen bg-sand">
      <header className="sticky top-0 z-40 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-xl sm:flex sm:justify-between">
        <Link to="/modelos" className="inline-flex min-w-0 items-center gap-2 text-sm font-medium">
          <ArrowLeft size={16} /> <span className="truncate">Voltar aos modelos</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex rounded-full border border-border p-1">
            {(
              [
                ["celular", Smartphone],
                ["tablet", Tablet],
                ["computador", Monitor],
              ] as const
            ).map(([k, Icone]) => (
              <button
                key={k}
                type="button"
                aria-label={k}
                onClick={() => setDisp(k)}
                className={`grid h-11 w-11 place-items-center rounded-full ${disp === k ? "bg-ink text-ink-foreground" : ""}`}
              >
                <Icone size={15} />
              </button>
            ))}
          </div>
          <Link
            to="/painel/novo"
            search={{ modelo }}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-ink-foreground"
          >
            Usar este modelo
          </Link>
        </div>
      </header>

      <div className="flex justify-center p-4 sm:p-8">
        <div
          className="w-full overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-lift)]"
          style={{ maxWidth: larguras[disp], height: "80vh" }}
        >
          <div className="h-full overflow-y-auto overflow-x-hidden">
            <MiniSite site={site} botaoFlutuante={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
