import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { GaleriaModelos, SiteFooter } from "@/components/landing/sections";
import { buscaGaleria } from "@/lib/nexa/galeria-busca";
import { modelos } from "@/lib/nexa/modelos";

export const Route = createFileRoute("/modelos")({
  validateSearch: buscaGaleria,
  head: () => ({
    meta: [
      { title: "Modelos por segmento — Nexa" },
      {
        name: "description",
        content: `${modelos.length} modelos de mini-sites e cardápios digitais com identidade própria para o seu negócio.`,
      },
      { property: "og:title", content: "Modelos por segmento — Nexa" },
      { property: "og:description", content: "Escolha o modelo com a cara do seu negócio." },
    ],
  }),
  component: Modelos,
});

function Modelos() {
  const { tipo = "minisite" } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-14">
        <h1 className="max-w-2xl text-4xl font-extrabold md:text-5xl">Galeria de modelos</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Cada modelo tem estrutura, seções e ritmo visual próprios. Visualize a demonstração
          completa antes de escolher.
        </p>
        <div className="mt-10">
          <GaleriaModelos
            tipoSelecionado={tipo}
            onTipoChange={(novo) => void navigate({ search: { tipo: novo }, resetScroll: false })}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
