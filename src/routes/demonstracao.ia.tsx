import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Camera, Check, PencilLine, Sparkles, Wand2 } from "lucide-react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/sections";

export const Route = createFileRoute("/demonstracao/ia")({
  head: () => ({
    meta: [
      { title: "Criação automática com IA — como funciona | Nexa" },
      {
        name: "description",
        content:
          "Veja o fluxo da criação automática com IA da Nexa: você envia as informações, a IA sugere uma primeira versão e você edita tudo no editor.",
      },
      { property: "og:title", content: "Criação automática com IA — como funciona | Nexa" },
      {
        property: "og:description",
        content: "Informações, sugestão da IA e edição livre: o caminho até o seu mini-site.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DemonstracaoIA,
});

const etapas = [
  {
    icone: Camera,
    titulo: "1. Informações",
    texto:
      "Você descreve o negócio e envia o que tiver: logo, fotos reais, serviços ou produtos e contato. Nada é obrigatório — quanto mais completo, melhor a primeira versão.",
    itens: [
      "Descrição do negócio",
      "Logo",
      "Fotos reais",
      "Serviços/produtos",
      "Contato e endereço",
    ],
  },
  {
    icone: Wand2,
    titulo: "2. Sugestão da IA",
    texto:
      "A IA monta uma proposta de estrutura: seções, textos, paleta e organização dos itens a partir do que você enviou. Antes de criar, aparece uma tela de revisão para aprovar ou ajustar.",
    itens: [
      "Seções sugeridas",
      "Textos iniciais",
      "Paleta e estilo",
      "Revisão antes de criar",
      "Nada é publicado automaticamente",
    ],
  },
  {
    icone: PencilLine,
    titulo: "3. Edição",
    texto:
      "O mini-site abre no editor comum da Nexa. Tudo o que a IA sugeriu pode ser reescrito, reordenado, ativado, removido ou trocado de modelo — a decisão final é sempre sua.",
    itens: [
      "Reordenar e desativar seções",
      "Reescrever qualquer texto",
      "Trocar imagens e cores",
      "Prévia em celular, tablet e desktop",
      "Publicar quando quiser",
    ],
  },
];

function DemonstracaoIA() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-12 md:py-16">
        <Link
          to="/modelos"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Voltar aos modelos
        </Link>

        <header className="mt-4 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
            <Sparkles size={12} aria-hidden="true" /> Feito com IA
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold md:text-5xl">
            Criação automática com IA
          </h1>
          <p className="mt-4 text-muted-foreground">
            Aqui não existe uma prévia fixa de um único negócio: o resultado nasce do que você
            envia. A IA cria uma primeira versão baseada na descrição, fotos, logo e segmento; você
            pode editar tudo depois.
          </p>
        </header>

        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {etapas.map((etapa) => {
            const Icone = etapa.icone;
            return (
              <li
                key={etapa.titulo}
                className="flex h-full flex-col rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6"
              >
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ink text-ink-foreground"
                  aria-hidden="true"
                >
                  <Icone size={18} />
                </span>
                <h2 className="mt-4 font-display text-lg font-bold">{etapa.titulo}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{etapa.texto}</p>
                <ul className="mt-4 space-y-1.5">
                  {etapa.itens.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <Check size={15} className="mt-0.5 shrink-0 text-ink" aria-hidden="true" />
                      <span className="min-w-0">{item}</span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>

        <section
          aria-labelledby="ia-cta"
          className="mt-10 grid gap-4 rounded-3xl border border-border bg-sand p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
        >
          <div className="min-w-0">
            <h2 id="ia-cta" className="font-display text-xl font-bold sm:text-2xl">
              Pronto para experimentar?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A sugestão só é gerada quando você pede, com as informações que você mesmo enviar. A
              criação automática faz parte dos planos pagos.
            </p>
          </div>
          <Link
            to="/painel/novo"
            search={{ modo: "ia" }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-ink-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:transform-none"
          >
            Criar com IA <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
