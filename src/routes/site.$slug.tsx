import { createFileRoute, Link } from "@tanstack/react-router";
import { MiniSite } from "@/components/minisite/MiniSite";
import { useNexa } from "@/lib/nexa/hooks";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/site/$slug")({
  head: () => ({
    meta: [
      { title: "Mini-site publicado — Nexa" },
      { name: "description", content: "Página profissional criada com a plataforma Nexa." },
      { property: "og:title", content: "Mini-site publicado — Nexa" },
      { property: "og:description", content: "Página profissional criada com a plataforma Nexa." },
    ],
  }),
  component: SitePublico,
});

function SitePublico() {
  const { slug } = Route.useParams();
  const { sites, pronto } = useNexa();
  const site = sites.find((s) => s.slug === slug);

  if (!pronto)
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );

  if (!site)
    return (
      <div className="grid min-h-screen place-items-center bg-background px-5 text-center">
        <div>
          <h1 className="font-display text-2xl font-bold">Página não encontrada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este endereço ainda não foi publicado.
          </p>
          <Link
            to="/painel"
            className="mt-6 inline-block rounded-full bg-ink px-5 py-3 text-sm font-semibold text-ink-foreground"
          >
            Ir para o painel
          </Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen">
      <MiniSite site={site} rastrear />
    </div>
  );
}
