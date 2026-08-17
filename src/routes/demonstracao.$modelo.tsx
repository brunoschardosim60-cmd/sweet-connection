import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Monitor, Smartphone, Tablet } from "lucide-react";
import { useState } from "react";
import { MiniSite } from "@/components/minisite/MiniSite";
import { siteDoModelo } from "@/lib/nexa/demo-modelos";
import { modelos } from "@/lib/nexa/modelos";
import { dimensoesDispositivo, larguraCssPrevia } from "@/lib/nexa/previa";

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

const dispositivos = dimensoesDispositivo;

function Demonstracao() {
  const { modelo } = Route.useParams();
  const [disp, setDisp] = useState<keyof typeof dispositivos>("celular");
  const site = siteDoModelo(modelo);
  const dispositivo = dispositivos[disp];
  const desktop = disp === "computador";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-sand">
      <header className="z-40 grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-xl sm:flex sm:justify-between">
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

      <main
        className={`flex min-h-0 flex-1 justify-center overflow-hidden ${desktop ? "p-0" : "items-center p-3 sm:p-5"}`}
        style={desktop ? undefined : { containerType: "size" }}
      >
        <div
          data-dispositivo={disp}
          className={
            desktop
              ? "h-full w-full overflow-hidden bg-background"
              : "max-h-full max-w-full overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-lift)]"
          }
          style={
            dispositivo
              ? {
                  aspectRatio: `${dispositivo.largura} / ${dispositivo.altura}`,
                  width: `min(100%, ${dispositivo.largura}px, calc(100cqh * ${dispositivo.largura / dispositivo.altura}))`,
                }
              : undefined
          }
        >
          <div className="h-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <MiniSite site={site} botaoFlutuante={false} interacoesExternas={false} />
          </div>
        </div>
      </main>
    </div>
  );
}
