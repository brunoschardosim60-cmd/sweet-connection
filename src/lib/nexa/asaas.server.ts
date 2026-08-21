const ASAAS_API_URL_PADRAO = "https://api.asaas.com/v3";

export type PlanoPago = "essential" | "professional" | "catalog";

const PRECO_CENTAVOS: Record<PlanoPago, number> = {
  essential: 500,
  professional: 7900,
  catalog: 11900,
};

export const PRECOS_PLANOS: Record<PlanoPago, string> = {
  essential: "5,00",
  professional: "79,00",
  catalog: "119,00",
};

export const FORMAS_PAGAMENTO_CHECKOUT = ["PIX", "CREDIT_CARD"] as const;

export function planoPago(valor: unknown): PlanoPago | null {
  return valor === "essential" || valor === "professional" || valor === "catalog" ? valor : null;
}

export function referenciaCheckout(id: string) {
  return `nexa-checkout:${id}`;
}

export function idDaReferencia(valor: unknown) {
  if (typeof valor !== "string" || !valor.startsWith("nexa-checkout:")) return null;
  const id = valor.slice("nexa-checkout:".length);
  return /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id) ? id : null;
}

export function proximoVencimento() {
  const data = new Date();
  data.setDate(data.getDate() + 1);
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia} 12:00:00`;
}

function chaveAsaas() {
  const chave = process.env["ASAAS_API_KEY"];
  if (!chave) throw new Error("Pagamento indisponível. Configure ASAAS_API_KEY na Vercel.");
  return chave;
}

async function requisicaoAsaas(path: string, init?: RequestInit) {
  const baseUrl = (process.env["ASAAS_API_URL"] ?? ASAAS_API_URL_PADRAO).replace(/\/$/, "");
  const resposta = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      access_token: chaveAsaas(),
      "content-type": "application/json",
      // Obrigatório para contas Asaas recentes e útil para rastrear a integração.
      "user-agent": "Nexa/1.0 (billing integration)",
      ...(init?.headers ?? {}),
    },
  });
  if (!resposta.ok) {
    const texto = await resposta.text();
    throw new Error(`Asaas respondeu ${resposta.status}: ${texto.slice(0, 300)}`);
  }
  return resposta.json() as Promise<Record<string, unknown>>;
}

export async function criarCheckoutAsaas(args: {
  sessionId: string;
  tier: PlanoPago;
  callbackUrl: string;
}) {
  const valor = PRECO_CENTAVOS[args.tier] / 100;
  const plano =
    args.tier === "essential"
      ? "Essencial"
      : args.tier === "professional"
        ? "Profissional"
        : "Catálogo";
  const data = await requisicaoAsaas("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      // Para a recorrência por Pix, a disponibilidade final depende da
      // habilitação de Pix Automático na conta do recebedor.
      billingTypes: FORMAS_PAGAMENTO_CHECKOUT,
      chargeTypes: ["RECURRENT"],
      minutesToExpire: 30,
      callback: {
        successUrl: args.callbackUrl,
        cancelUrl: args.callbackUrl,
        expiredUrl: args.callbackUrl,
      },
      externalReference: referenciaCheckout(args.sessionId),
      items: [
        {
          name: `Nexa ${plano}`,
          description: `Assinatura mensal Nexa ${plano}`,
          quantity: 1,
          value: valor,
        },
      ],
      subscription: { cycle: "MONTHLY", nextDueDate: proximoVencimento() },
    }),
  });
  const id = typeof data["id"] === "string" ? data["id"] : null;
  if (!id) throw new Error("O Asaas não retornou o identificador do checkout.");
  const url =
    typeof data["url"] === "string"
      ? data["url"]
      : `https://asaas.com/checkoutSession/show?id=${encodeURIComponent(id)}`;
  return { id, url };
}

export async function buscarPagamentoAsaas(paymentId: string) {
  return requisicaoAsaas(`/payments/${encodeURIComponent(paymentId)}`);
}

export function statusAssinaturaAsaas(status: unknown) {
  if (status === "RECEIVED" || status === "CONFIRMED") return "active" as const;
  if (status === "OVERDUE") return "past_due" as const;
  if (
    [
      "REFUNDED",
      "REFUND_REQUESTED",
      "CHARGEBACK_REQUESTED",
      "CHARGEBACK_DISPUTE",
      "AWAITING_CHARGEBACK_REVERSAL",
    ].includes(String(status))
  )
    return "cancelled" as const;
  return null;
}
