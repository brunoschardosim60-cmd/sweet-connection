import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Crown,
  Loader2,
  Lock,
  Minus,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
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

type Assinatura = {
  subscription_tier: string;
  subscription_status: string;
  billing_cycle: string;
};
type Fatura = {
  id: string;
  status: string;
  value: number | null;
  dueDate: string | null;
  paymentDate: string | null;
  invoiceUrl: string | null;
};
type PedidoReembolso = {
  id: string;
  status: "requested" | "approved" | "rejected" | "refunded";
  amount: number | null;
  requested_at: string;
  resolution_note: string | null;
};

const nomes: Record<string, string> = {
  none: "Teste grátis",
  essential: "Essencial",
  professional: "Profissional",
  catalog: "Catálogo",
};

const beneficios: Record<string, string[]> = {
  none: [
    "1 projeto completo em rascunho",
    "Editor, modelos e prévia para testar",
    "Produtos, serviços, seções e aparência para montar",
  ],
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
  none: [
    "Publicar o mini-site ou cardápio",
    "Receber mensagens, pedidos e agendamentos reais",
    "Criação automática com IA e integrações/API",
    "Mais de um projeto",
  ],
};

type PlanoContratavel = "essential" | "professional" | "catalog";
type Ciclo = "monthly" | "annual";
const precosAnuais: Record<PlanoContratavel, string> = {
  essential: "R$ 390",
  professional: "R$ 790",
  catalog: "R$ 1.190",
};
const economiasAnuais: Record<PlanoContratavel, string> = {
  essential: "Economize R$ 78 por ano",
  professional: "Economize R$ 158 por ano",
  catalog: "Economize R$ 238 por ano",
};

const opcoes: {
  tier: PlanoContratavel;
  nome: string;
  preco: string;
  precoAnterior?: string;
  sufixo: string;
  descricao: string;
  nota: string;
}[] = [
  {
    tier: "essential",
    nome: "Essencial",
    preco: "R$ 5",
    precoAnterior: "R$ 39",
    sufixo: "no 1º mês",
    descricao: "1 mini-site publicado",
    nota: "R$ 5 no primeiro mês · R$ 39/mês nas renovações. Promoção válida apenas para novos clientes.",
  },
  {
    tier: "professional",
    nome: "Profissional",
    preco: "R$ 79",
    sufixo: "/mês",
    descricao: "Até 3 mini-sites + IA semanal",
    nota: "R$ 79/mês desde a primeira cobrança.",
  },
  {
    tier: "catalog",
    nome: "Catálogo",
    preco: "R$ 119",
    sufixo: "/mês",
    descricao: "Tudo do Profissional + catálogo",
    nota: "R$ 119/mês desde a primeira cobrança.",
  },
];

function MeuPlano() {
  const [dados, setDados] = useState<Assinatura | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [planoEscolhido, setPlanoEscolhido] = useState<PlanoContratavel>("essential");
  const [ciclo, setCiclo] = useState<Ciclo>("monthly");
  const [pagando, setPagando] = useState(false);
  const [erroPagamento, setErroPagamento] = useState("");
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [fimCancelamento, setFimCancelamento] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [mostrarCancelamento, setMostrarCancelamento] = useState(false);
  const [motivoReembolso, setMotivoReembolso] = useState("");
  const [solicitandoReembolso, setSolicitandoReembolso] = useState(false);
  const [pedidoReembolso, setPedidoReembolso] = useState<PedidoReembolso | null>(null);

  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    const plano = parametros.get("plano");
    const periodicidade = parametros.get("ciclo");
    if (plano === "essential" || plano === "professional" || plano === "catalog") {
      setPlanoEscolhido(plano);
    }
    if (periodicidade === "monthly" || periodicidade === "annual") setCiclo(periodicidade);
  }, []);

  useEffect(() => {
    void supabase
      .from("profiles")
      .select("subscription_tier,subscription_status,billing_cycle")
      .single()
      .then(({ data }) => {
        setDados(data);
        setCarregando(false);
      });
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.access_token) return;
      const resposta = await fetch("/api/billing/asaas/manage", {
        headers: { authorization: `Bearer ${session.access_token}` },
      });
      if (!resposta.ok) return;
      const dadosGerenciamento = (await resposta.json()) as {
        invoices?: Fatura[];
        subscription?: {
          currentPeriodEnd?: string | null;
          cancelAtPeriodEnd?: boolean;
          cycle?: Ciclo;
        };
        refundRequest?: PedidoReembolso | null;
      };
      setFaturas(dadosGerenciamento.invoices ?? []);
      if (dadosGerenciamento.subscription?.cycle)
        setDados(
          (atual) => atual && { ...atual, billing_cycle: dadosGerenciamento.subscription!.cycle! },
        );
      if (dadosGerenciamento.subscription?.cancelAtPeriodEnd)
        setFimCancelamento(dadosGerenciamento.subscription.currentPeriodEnd ?? null);
      setPedidoReembolso(dadosGerenciamento.refundRequest ?? null);
    });
  }, []);

  if (carregando) {
    return (
      <section className="mx-auto w-full max-w-3xl space-y-6" aria-busy="true">
        <div className="h-8 w-48 animate-pulse rounded-full bg-secondary motion-reduce:animate-none" />
        <div className="h-56 animate-pulse rounded-3xl bg-secondary motion-reduce:animate-none" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-secondary motion-reduce:animate-none"
            />
          ))}
        </div>
        <p className="sr-only" role="status">
          Carregando seu plano…
        </p>
      </section>
    );
  }

  const tier = dados?.subscription_tier || "none";
  const ativo = dados?.subscription_status === "active" && tier !== "none";
  const cicloAtivo = dados?.billing_cycle === "annual" ? "anual" : "mensal";
  const inclusos = beneficios[tier] ?? beneficios["none"]!;
  const restricoes = bloqueado[tier] ?? [];
  const opcaoSelecionada = opcoes.find((opcao) => opcao.tier === planoEscolhido)!;

  async function iniciarCheckout() {
    setPagando(true);
    setErroPagamento("");
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao.session?.access_token;
      if (!token) throw new Error("Sua sessão expirou. Entre novamente para contratar um plano.");
      const resposta = await fetch("/api/billing/asaas/checkout", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ tier: planoEscolhido, cycle: ciclo }),
      });
      const retorno = (await resposta.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!resposta.ok || !retorno.url)
        throw new Error(retorno.error ?? "Não foi possível abrir o pagamento.");
      window.location.assign(retorno.url);
    } catch (error) {
      setErroPagamento(
        error instanceof Error ? error.message : "Não foi possível abrir o pagamento.",
      );
      setPagando(false);
    }
  }

  async function cancelarAssinatura() {
    if (
      !window.confirm(
        "Cancelar a renovação automática? Seu acesso permanece ativo até o fim do período já pago.",
      )
    )
      return;
    setCancelando(true);
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const resposta = await fetch("/api/billing/asaas/cancel", {
        method: "POST",
        headers: { authorization: `Bearer ${sessao.session?.access_token ?? ""}` },
      });
      const retorno = (await resposta.json().catch(() => ({}))) as {
        currentPeriodEnd?: string | null;
        error?: string;
      };
      if (!resposta.ok) throw new Error(retorno.error ?? "Não foi possível cancelar a assinatura.");
      setFimCancelamento(retorno.currentPeriodEnd ?? null);
      setMostrarCancelamento(false);
    } catch (error) {
      setErroPagamento(
        error instanceof Error ? error.message : "Não foi possível cancelar a assinatura.",
      );
    } finally {
      setCancelando(false);
    }
  }

  async function solicitarReembolso() {
    if (motivoReembolso.trim().length < 10) {
      setErroPagamento("Explique o motivo do reembolso em pelo menos 10 caracteres.");
      return;
    }
    setSolicitandoReembolso(true);
    setErroPagamento("");
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const resposta = await fetch("/api/billing/asaas/refund-request", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${sessao.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ reason: motivoReembolso.trim() }),
      });
      const retorno = (await resposta.json().catch(() => ({}))) as {
        error?: string;
        request?: PedidoReembolso;
      };
      if (!resposta.ok || !retorno.request)
        throw new Error(retorno.error ?? "Não foi possível solicitar o reembolso.");
      setPedidoReembolso(retorno.request);
      setMotivoReembolso("");
    } catch (error) {
      setErroPagamento(
        error instanceof Error ? error.message : "Não foi possível solicitar o reembolso.",
      );
    } finally {
      setSolicitandoReembolso(false);
    }
  }

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
              {tier === "essential" && (
                <p className="mt-1 text-sm font-medium opacity-80">
                  R$ 5 no primeiro mês · R$ 39/mês nas renovações
                </p>
              )}
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
            {ativo ? `Plano ${cicloAtivo} ativo` : "Disponível sem plano"}
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

          <p
            id="rotulo-escolha-plano"
            className="mt-6 text-xs font-semibold uppercase tracking-wide opacity-70"
          >
            {ativo ? "Trocar de plano" : "Escolher um plano"}
          </p>
          <div
            role="group"
            aria-label="Periodicidade"
            className="mt-3 inline-flex rounded-full border border-border p-1"
          >
            <button
              type="button"
              onClick={() => setCiclo("monthly")}
              className={`min-h-10 rounded-full px-4 text-xs font-semibold ${ciclo === "monthly" ? "bg-ink text-ink-foreground" : "text-muted-foreground"}`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setCiclo("annual")}
              className={`min-h-10 rounded-full px-4 text-xs font-semibold ${ciclo === "annual" ? "bg-ink text-ink-foreground" : "text-muted-foreground"}`}
            >
              Anual · economize
            </button>
          </div>
          <div
            role="radiogroup"
            aria-labelledby="rotulo-escolha-plano"
            className="mt-3 grid gap-3 sm:grid-cols-3"
          >
            {opcoes.map((opcao) => {
              const selecionado = planoEscolhido === opcao.tier;
              return (
                <button
                  key={opcao.tier}
                  type="button"
                  role="radio"
                  aria-checked={selecionado}
                  onClick={() => setPlanoEscolhido(opcao.tier)}
                  className={`flex min-h-28 flex-col rounded-2xl border p-3 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    selecionado
                      ? ativo
                        ? "border-lime bg-ink-foreground/10 outline-lime"
                        : "border-ink bg-secondary outline-ink"
                      : ativo
                        ? "border-ink-foreground/20 hover:border-ink-foreground/50"
                        : "border-border hover:border-foreground/40"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-bold">{opcao.nome}</span>
                    {selecionado && (
                      <Check
                        size={16}
                        className={`shrink-0 ${ativo ? "text-lime" : "text-ink"}`}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                    {ciclo === "monthly" && opcao.precoAnterior && (
                      <span className="text-sm font-bold line-through opacity-60">
                        {opcao.precoAnterior}
                      </span>
                    )}
                    <span className="font-display text-xl font-extrabold">
                      {ciclo === "annual" ? precosAnuais[opcao.tier] : opcao.preco}
                    </span>
                    <span className="text-xs font-semibold opacity-70">
                      {ciclo === "annual" ? "/ano" : opcao.sufixo}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs opacity-70">{opcao.descricao}</span>
                  {ciclo === "annual" && (
                    <span className="mt-1 text-xs font-semibold text-lime">
                      {economiasAnuais[opcao.tier]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p
            className={`mt-3 rounded-xl px-3 py-2 text-sm font-medium ${
              ativo ? "bg-ink-foreground/10" : "bg-secondary text-foreground"
            }`}
          >
            {ciclo === "annual"
              ? `${economiasAnuais[opcaoSelecionada.tier]} comparado a 12 mensalidades do valor padrão. Cobrança anual de ${precosAnuais[opcaoSelecionada.tier]} com renovação anual.`
              : opcaoSelecionada.nota}
          </p>

          <button
            type="button"
            onClick={() => void iniciarCheckout()}
            disabled={pagando}
            className={`mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transform-none sm:w-auto ${
              ativo ? "bg-lime text-ink outline-lime" : "bg-ink text-ink-foreground outline-ink"
            }`}
          >
            {pagando ? (
              <Loader2
                className="animate-spin motion-reduce:animate-none"
                size={16}
                aria-hidden="true"
              />
            ) : (
              <ArrowUpRight size={16} aria-hidden="true" />
            )}
            {pagando
              ? "Abrindo pagamento…"
              : `Assinar ${opcaoSelecionada.nome} ${ciclo === "annual" ? "anual" : "mensal"}`}
          </button>
          <p className="mt-2 text-xs text-muted-foreground" role="status">
            {pagando
              ? "Estamos abrindo o ambiente seguro de pagamento. Não feche esta página."
              : "Você será levado ao ambiente de pagamento. O plano só muda depois da confirmação da cobrança."}
          </p>
          {erroPagamento && (
            <div
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3"
            >
              <TriangleAlert
                size={16}
                className="mt-0.5 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-destructive">
                  Não foi possível abrir o pagamento
                </span>
                <span className="mt-0.5 block break-words text-xs text-muted-foreground">
                  {erroPagamento}
                </span>
              </span>
            </div>
          )}
        </div>
      </article>

      {ativo && (
        <section className="rounded-2xl border border-border p-5">
          <h2 className="text-base font-bold">Cobranças e assinatura</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {fimCancelamento
              ? `Renovação cancelada. Seu acesso continua até ${new Date(fimCancelamento).toLocaleDateString("pt-BR")}.`
              : "Acompanhe seus pagamentos e gerencie a renovação automática."}
          </p>
          {faturas.length > 0 && (
            <ul className="mt-4 divide-y divide-border text-sm">
              {faturas.map((fatura) => (
                <li
                  key={fatura.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <span>
                    R$ {(fatura.value ?? 0).toFixed(2).replace(".", ",")} · {fatura.status}
                  </span>
                  {fatura.invoiceUrl && (
                    <a
                      href={fatura.invoiceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="min-h-11 py-2 underline"
                    >
                      Ver fatura
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!fimCancelamento && (
            <>
              {!mostrarCancelamento ? (
                <button
                  type="button"
                  onClick={() => setMostrarCancelamento(true)}
                  className="mt-4 min-h-11 rounded-full border border-destructive px-4 text-sm font-semibold text-destructive"
                >
                  Cancelar assinatura
                </button>
              ) : (
                <div className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
                  <h3 className="font-semibold text-destructive">Cancelar renovação automática</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Seu acesso continuará ativo até o fim do período já pago. O reembolso, quando
                    cabível, só poderá ser solicitado depois desta confirmação e passará por
                    análise.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void cancelarAssinatura()}
                      disabled={cancelando}
                      className="min-h-11 rounded-full bg-destructive px-4 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {cancelando ? "Cancelando…" : "Confirmar cancelamento"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMostrarCancelamento(false)}
                      disabled={cancelando}
                      className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold disabled:opacity-60"
                    >
                      Manter assinatura
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          {fimCancelamento && (
            <div className="mt-4 rounded-2xl border border-border bg-secondary/30 p-4">
              <h3 className="font-semibold">Precisa solicitar reembolso?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                O pedido é analisado antes de qualquer estorno. Se aprovado, a devolução é
                processada pelo Asaas na forma de pagamento original, quando suportada.
              </p>
              {pedidoReembolso ? (
                <p className="mt-3 rounded-xl bg-card p-3 text-sm" role="status">
                  Solicitação{" "}
                  {pedidoReembolso.status === "requested"
                    ? "recebida e em análise"
                    : pedidoReembolso.status}
                  .
                  {pedidoReembolso.amount
                    ? ` Valor solicitado: R$ ${pedidoReembolso.amount.toFixed(2).replace(".", ",")}.`
                    : ""}
                  {pedidoReembolso.resolution_note ? ` ${pedidoReembolso.resolution_note}` : ""}
                </p>
              ) : (
                <>
                  <label className="mt-3 block text-sm font-semibold">
                    Motivo do pedido
                    <textarea
                      value={motivoReembolso}
                      onChange={(event) => setMotivoReembolso(event.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder="Conte brevemente o motivo da solicitação."
                      className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void solicitarReembolso()}
                    disabled={solicitandoReembolso || motivoReembolso.trim().length < 10}
                    className="mt-3 min-h-11 rounded-full border border-destructive px-4 text-sm font-semibold text-destructive disabled:opacity-60"
                  >
                    {solicitandoReembolso
                      ? "Enviando solicitação…"
                      : "Solicitar análise de reembolso"}
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      )}

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
