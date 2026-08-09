import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { GaleriaModelos, SiteFooter } from "@/components/landing/sections";

export const Route = createFileRoute("/modelos")({
  head: () => ({
    meta: [
      { title: "Modelos por segmento — Nexa" },
      {
        name: "description",
        content:
          "12 modelos de mini-site com identidade própria para restaurantes, lojas, barbearias, clínicas, transportadoras e profissionais.",
      },
      { property: "og:title", content: "Modelos por segmento — Nexa" },
      { property: "og:description", content: "Escolha o modelo com a cara do seu negócio." },
    ],
  }),
  component: Modelos,
});

function Modelos() {
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
          <GaleriaModelos />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
