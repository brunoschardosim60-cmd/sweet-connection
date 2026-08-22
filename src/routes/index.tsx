import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { origemPublica } from "@/lib/nexa/clipboard";
import { dadosEstruturadosDaNexa, serializarJsonLd } from "@/lib/nexa/seo-estruturado";
import {
  ComoFunciona,
  Comparacao,
  CtaFinal,
  Duvidas,
  EditorDemo,
  Estatisticas,
  FaixaSegmentos,
  Hero,
  Planos,
  Recursos,
  RecursosPorSegmento,
  SecaoModelos,
  SiteFooter,
} from "@/components/landing/sections";

export const Route = createFileRoute("/")({
  head: () => {
    const url = origemPublica();
    return {
      links: [{ rel: "canonical", href: url }],
      meta: [
        { title: "Nexa — Mini-sites profissionais para o seu negócio" },
        {
          name: "description",
          content:
            "Crie uma página profissional com WhatsApp, catálogo, serviços, agendamentos e localização. Mini-sites brasileiros prontos em minutos.",
        },
        { property: "og:title", content: "Nexa — Mini-sites profissionais para o seu negócio" },
        {
          property: "og:description",
          content: "Seu negócio merece mais do que apenas um link. Conheça os modelos da Nexa.",
        },
        { property: "og:url", content: url },
      ],
    };
  },
  component: Index,
});

function Index() {
  const dadosEstruturados = dadosEstruturadosDaNexa();
  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializarJsonLd(dadosEstruturados) }}
      />
      <SiteHeader />
      <main>
        <Hero />
        <FaixaSegmentos />
        <Comparacao />
        <Recursos />
        <SecaoModelos />
        <EditorDemo />
        <RecursosPorSegmento />
        <Estatisticas />
        <ComoFunciona />
        <Planos />
        <Duvidas />
        <CtaFinal />
      </main>
      <SiteFooter />
    </div>
  );
}
