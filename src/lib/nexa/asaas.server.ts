const ASAAS_API_URL = "https://api.asaas.com/v3";

export type PlanoPago = "essential" | "professional" | "catalog";

const PRECO_CENTAVOS: Record<PlanoPago, number> = {
  essential: 100,
  professional: 7900,
  catalog: 11900,
};

export const PRECOS_PLANOS: Record<PlanoPago, string> = {
  essential: "1,00",
  professional: "79,00",
  catalog: "119,00",
};

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
  return data.toISOString().slice(0, 10);
}

function chaveAsaas() {
  const chave = process.env["ASAAS_API_KEY"];
  if (!chave) throw new Error("Pagamento indisponível. Configure ASAAS_API_KEY na Vercel.");
  return chave;
}

async function requisicaoAsaas(path: string, init?: RequestInit) {
  const resposta = await fetch(`${ASAAS_API_URL}${path}`, {
    ...init,
    headers: {
      access_token: chaveAsaas(),
      "content-type": "application/json",
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
      billingTypes: ["PIX", "CREDIT_CARD"],
      chargeTypes: ["RECURRENT"],
      minutesToExpire: 30,
      callback: { successUrl: args.callbackUrl, cancelUrl: args.callbackUrl },
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
