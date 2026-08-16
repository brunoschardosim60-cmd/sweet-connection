import { createFileRoute, notFound } from "@tanstack/react-router";
import { MiniSite } from "@/components/minisite/MiniSite";
import { buscarMinisitePublicado } from "@/lib/nexa/public-api";

export const Route = createFileRoute("/site/$slug")({
  loader: async ({ params }) => {
    const site = await buscarMinisitePublicado(params.slug);
    if (!site) throw notFound();
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
    const dominio = loaderData.integracoes.dominio?.trim().replace(/^https?:\/\//, "");
    const canonical = dominio
      ? `https://${dominio.replace(/\/+$/, "")}/site/${loaderData.slug}`
      : `/site/${loaderData.slug}`;

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
  component: SitePublico,
});

function SitePublico() {
  const site = Route.useLoaderData();
  return (
    <div className="min-h-screen">
      <MiniSite site={site} rastrear />
    </div>
  );
}
