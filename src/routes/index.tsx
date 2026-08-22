import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { useAuthSession } from "@/hooks/use-auth-session";
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
  head: () => ({
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
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { user, carregando } = useAuthSession();

  useEffect(() => {
    if (user) void navigate({ to: "/painel", replace: true });
  }, [navigate, user]);

  // Quem já entrou na Nexa deve cair no próprio espaço de trabalho, não
  // voltar à página comercial como se ainda precisasse criar uma conta.
  if (carregando || user) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background text-sm text-muted-foreground">
        Abrindo seu painel…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
