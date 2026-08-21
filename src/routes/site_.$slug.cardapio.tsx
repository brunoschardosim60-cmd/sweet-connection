import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CatalogoPagina } from "@/components/minisite/CatalogoPagina";
import { Rastreadores } from "@/components/minisite/Rastreadores";
import { perfilCatalogo } from "@/lib/nexa/catalogo";
import { ehModeloCardapio } from "@/lib/nexa/cardapio-modelos";
import { buscarMinisitePublicado } from "@/lib/nexa/public-api";
import { enderecoSite } from "@/lib/nexa/clipboard";

export const Route = createFileRoute("/site_/$slug/cardapio")({
  loader: async ({ params }) => {
    const site = await buscarMinisitePublicado(params.slug);
    if (!site) throw notFound({ routeId: "/site_/$slug/cardapio" });
    return site;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Cardápio indisponível — Nexa" }, { name: "robots", content: "noindex" }],
      };
    }
    const perfil = perfilCatalogo(loaderData);
    const titulo = `${perfil.rotulo} — ${loaderData.conteudo.nome}`;
    const descricao =
      loaderData.seo.descricao ||
      `${perfil.rotulo} de ${loaderData.conteudo.nome}: itens, preços e pedidos pelo WhatsApp.`;
    const imagem = loaderData.seo.imagem || loaderData.conteudo.capa;
    const canonical = ehModeloCardapio(loaderData.modeloId)
      ? enderecoSite(loaderData.slug)
      : `${enderecoSite(loaderData.slug)}/cardapio`;

    return {
      meta: [
        { title: titulo },
        { name: "description", content: descricao },
        { property: "og:title", content: titulo },
        { property: "og:description", content: descricao },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        ...(imagem ? [{ property: "og:image", content: imagem }] : []),
        { name: "twitter:card", content: imagem ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: titulo },
        { name: "twitter:description", content: descricao },
        ...(imagem ? [{ name: "twitter:image", content: imagem }] : []),
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: CardapioPublico,
  notFoundComponent: CardapioNaoEncontrado,
});

function CardapioNaoEncontrado() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl font-bold">Cardápio indisponível</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este endereço não existe, ainda não foi publicado ou está pausado.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-ink-foreground"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

function CardapioPublico() {
  const site = Route.useLoaderData();
  return (
    <>
      <Rastreadores site={site} />
      <CatalogoPagina site={site} rastrear mostrarVoltar={!ehModeloCardapio(site.modeloId)} />
    </>
  );
}
