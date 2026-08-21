import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MiniSite } from "@/components/minisite/MiniSite";
import { CatalogoPagina } from "@/components/minisite/CatalogoPagina";
import { Rastreadores } from "@/components/minisite/Rastreadores";
import { buscarMinisitePublicado } from "@/lib/nexa/public-api";
import { enderecoSite } from "@/lib/nexa/clipboard";
import { ehModeloCardapio } from "@/lib/nexa/cardapio-modelos";

export const Route = createFileRoute("/site/$slug")({
  loader: async ({ params }) => {
    const site = await buscarMinisitePublicado(params.slug);
    if (!site) throw notFound({ routeId: "/site/$slug" });
    return site;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Mini-site não encontrado — Nexa" },
          { name: "robots", content: "noindex" },
        ],
      };
    }

    const titulo = loaderData.seo.titulo || loaderData.conteudo.nome;
    const descricao = loaderData.seo.descricao || loaderData.conteudo.descricao;
    const imagem = loaderData.seo.imagem || loaderData.conteudo.capa;
    const canonical = enderecoSite(loaderData.slug);

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
      links: [
        { rel: "canonical", href: canonical },
        { rel: "manifest", href: `/api/public/manifest/${loaderData.slug}` },
      ],
    };
  },
  component: SitePublico,
  notFoundComponent: MinisiteNaoEncontrado,
});

function MinisiteNaoEncontrado() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl font-bold">Mini-site indisponível</h1>
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

function SitePublico() {
  const site = Route.useLoaderData();
  const tipoSchema =
    site.cliente.segmento === "alimentacao"
      ? "Restaurant"
      : site.cliente.segmento === "beleza"
        ? "BarberShop"
        : "LocalBusiness";
  const dadosEstruturados = {
    "@context": "https://schema.org",
    "@type": tipoSchema,
    name: site.conteudo.nome,
    description: site.seo.descricao || site.conteudo.descricao,
    url: enderecoSite(site.slug),
    ...(site.conteudo.capa ? { image: site.conteudo.capa } : {}),
    ...(site.conteudo.telefone ? { telephone: site.conteudo.telefone } : {}),
    ...(site.conteudo.endereco || site.cliente.cidade
      ? {
          address: {
            "@type": "PostalAddress",
            ...(site.conteudo.endereco ? { streetAddress: site.conteudo.endereco } : {}),
            addressLocality: site.cliente.cidade,
            addressRegion: site.cliente.estado,
            addressCountry: "BR",
          },
        }
      : {}),
    ...(site.conteudo.instagram ? { sameAs: [site.conteudo.instagram] } : {}),
  };
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados) }}
      />
      <Rastreadores site={site} />
      {ehModeloCardapio(site.modeloId) ? (
        <CatalogoPagina site={site} rastrear mostrarVoltar={false} />
      ) : (
        <MiniSite site={site} rastrear />
      )}
    </div>
  );
}
