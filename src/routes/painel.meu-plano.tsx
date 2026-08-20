import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Crown, Loader2, Lock, Minus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AvisoPlano } from "@/components/planos/AvisoPlano";

export const Route = createFileRoute("/painel/meu-plano")({
  head: () => ({
    meta: [
      { title: "Meu plano — Nexa" },
      {
        name: "description",
        content: "Veja o plano da sua conta Nexa, o que está liberado e como fazer upgrade.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MeuPlano,
});

type Assinatura = { subscription_tier: string; subscription_status: string };

const nomes: Record<string, string> = {
  none: "Sem plano",
  essential: "Essencial",
  professional: "Profissional",
  catalog: "Catálogo",
};

const beneficios: Record<string, string[]> = {
  none: ["1 rascunho salvo", "Prévia do mini-site", "Modelos para explorar"],
  essential: [
    "Publicação do mini-site",
    "Links, WhatsApp e redes",
    "Horários e localização",
    "QR Code",
  ],
  professional: [
    "Tudo do Essencial",
    "Serviços e agendamento",
    "Portfólio e depoimentos",
    "Formulário de orçamento",
    "Estatísticas",
  ],
  catalog: [
    "Tudo do Profissional",
    "Catálogo e cardápio",
    "Cupons e promoções",
    "Pedidos via WhatsApp",
  ],
};

const bloqueado: Record<string, string[]> = {
  none: ["Publicar o mini-site", "Criação automática com IA", "Mais de um projeto"],
};

function MeuPlano() {
  const [dados, setDados] = useState<Assinatura | null>(null);

  useEffect(() => {
    void supabase
      .from("profiles")
      .select("subscription_tier,subscription_status")
      .single()
      .then(({ data }) => setDados(data));
  }, []);

  if (!dados) {
    return (
      <div className="grid min-h-[40vh] place-items-center" role="status">
        <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        <span className="sr-only">Carregando seu plano…</span>
      </div>
    );
  }

  const tier = dados.subscription_tier || "none";
  const ativo = dados.subscription_status === "active" && tier !== "none";
  const inclusos = beneficios[tier] ?? beneficios["none"]!;
  const restricoes = bloqueado[tier] ?? [];

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <header className="min-w-0">
        <h1 className="text-2xl font-bold sm:text-3xl">Meu plano</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe o acesso da sua conta e escolha o plano ideal para o seu negócio.
        </p>
      </header>

      <article
        className={`overflow-hidden rounded-3xl border ${
          ativo ? "border-ink bg-ink text-ink-foreground" : "border-border bg-card"
        }`}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 p-5 sm:p-7">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
                ativo ? "bg-lime text-ink" : "bg-secondary text-foreground"
              }`}
              aria-hidden="true"
            >
              <Crown size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                Plano atual
              </p>
              <h2 className="truncate font-display text-2xl font-extrabold sm:text-3xl">
                {nomes[tier] ?? "Sem plano"}
              </h2>
            </div>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
              ativo ? "bg-lime text-ink" : "border border-border bg-secondary text-muted-foreground"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${ativo ? "bg-ink" : "bg-muted-foreground"}`}
              aria-hidden="true"
            />
            {ativo ? "Ativo" : "Inativo"}
          </span>
        </div>

        <div
          className={`border-t p-5 sm:p-7 ${ativo ? "border-ink-foreground/15" : "border-border"}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            {ativo ? "Incluído no seu plano" : "Disponível sem plano"}
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {inclusos.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <Check
                  size={16}
                  className={`mt-0.5 shrink-0 ${ativo ? "text-lime" : "text-ink"}`}
                  aria-hidden="true"
                />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>

          {restricoes.length > 0 && (
            <>
              <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Bloqueado sem plano
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {restricoes.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-muted-foreground line-through decoration-muted-foreground/50"
                  >
                    <Minus size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0">{item}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <Link
            to="/"
            hash="planos"
            className={`mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transform-none sm:w-auto ${
              ativo ? "bg-lime text-ink outline-lime" : "bg-ink text-ink-foreground outline-ink"
            }`}
          >
            {ativo ? "Fazer upgrade" : "Escolher plano"}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </article>

      {!ativo && (
        <div className="grid gap-4 sm:grid-cols-2">
          <AvisoPlano motivo="sem-plano" />
          <AvisoPlano motivo="sem-ia" />
        </div>
      )}

      <p className="flex items-start gap-2 rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
        {ativo ? (
          <Sparkles size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        ) : (
          <Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        )}
        A alteração de plano é feita pela equipe Nexa. Fale com o suporte para ativar, trocar ou
        cancelar sua assinatura.
      </p>
    </section>
  );
}
