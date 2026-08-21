import { createFileRoute } from "@tanstack/react-router";
import {
  buscarPagamentoAsaas,
  idDaReferencia,
  statusAssinaturaAsaas,
} from "@/lib/nexa/asaas.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type EventoAsaas = { payment?: { id?: unknown } };

export const Route = createFileRoute("/api/webhooks/asaas")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["ASAAS_WEBHOOK_TOKEN"];
        if (!secret) return new Response("Webhook indisponível", { status: 503 });
        if (request.headers.get("asaas-access-token") !== secret)
          return new Response("Não autorizado", { status: 401 });

        const event = (await request.json().catch(() => null)) as EventoAsaas | null;
        const paymentId = typeof event?.payment?.id === "string" ? event.payment.id : null;
        if (!paymentId) return new Response("Evento ignorado", { status: 202 });

        try {
          // Nunca confiamos no corpo recebido: consultamos o pagamento no Asaas com a chave privada.
          const payment = await buscarPagamentoAsaas(paymentId);
          const checkoutId = idDaReferencia(payment["externalReference"]);
          const state = statusAssinaturaAsaas(payment["status"]);
          if (!checkoutId || !state) return new Response("Evento sem alteração", { status: 202 });

          const { data: checkout, error: checkoutError } = await supabaseAdmin
            .from("billing_checkout_sessions")
            .select("id,owner_id,tier")
            .eq("id", checkoutId)
            .eq("provider", "asaas")
            .maybeSingle();
          if (checkoutError || !checkout)
            return new Response("Checkout não encontrado", { status: 202 });

          const customerId = typeof payment["customer"] === "string" ? payment["customer"] : null;
          const subscriptionId =
            typeof payment["subscription"] === "string" ? payment["subscription"] : null;
          const checkoutStatus =
            state === "active" ? "paid" : state === "past_due" ? "past_due" : "cancelled";
          await (supabaseAdmin as any).from("billing_invoices").upsert(
            {
              owner_id: checkout.owner_id,
              provider: "asaas",
              provider_payment_id: paymentId,
              provider_subscription_id: subscriptionId,
              tier: checkout.tier,
              status: String(payment["status"] ?? "UNKNOWN"),
              amount: typeof payment["value"] === "number" ? payment["value"] : null,
              due_date: typeof payment["dueDate"] === "string" ? payment["dueDate"] : null,
              paid_at: typeof payment["paymentDate"] === "string" ? payment["paymentDate"] : null,
              invoice_url: typeof payment["invoiceUrl"] === "string" ? payment["invoiceUrl"] : null,
            },
            { onConflict: "provider_payment_id" },
          );
          await supabaseAdmin
            .from("billing_checkout_sessions")
            .update({
              status: checkoutStatus,
              provider_customer_id: customerId,
              provider_subscription_id: subscriptionId,
              paid_at: state === "active" ? new Date().toISOString() : null,
            })
            .eq("id", checkout.id);

          const profileUpdate = {
            subscription_status: state,
            ...(state === "active" ? { subscription_tier: checkout.tier } : {}),
            billing_provider: "asaas",
            billing_customer_id: customerId,
            billing_subscription_id: subscriptionId,
            billing_updated_at: new Date().toISOString(),
          };
          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update(profileUpdate)
            .eq("id", checkout.owner_id);
          if (profileError) throw profileError;
          return new Response("OK", { status: 200 });
        } catch (error) {
          console.error("[Asaas webhook]", error);
          return new Response("Falha temporária", { status: 503 });
        }
      },
    },
  },
});
