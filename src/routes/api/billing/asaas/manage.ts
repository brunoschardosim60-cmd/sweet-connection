import { createFileRoute } from "@tanstack/react-router";
import { listarPagamentosAsaas } from "@/lib/nexa/asaas.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
// The server-only billing columns are newer than the checked-in generated client types.
/* eslint-disable @typescript-eslint/no-explicit-any */

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

async function usuarioAutenticado(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : data.user;
}

export const Route = createFileRoute("/api/billing/asaas/manage")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const user = await usuarioAutenticado(request);
          if (!user) return json({ error: "Sua sessão expirou." }, 401);
          const { data: profile, error } = await (supabaseAdmin as any)
            .from("profiles")
            .select(
              "subscription_tier,subscription_status,billing_provider,billing_subscription_id,billing_cancel_at_period_end,billing_current_period_end",
            )
            .eq("id", user.id)
            .single();
          if (error || !profile) throw new Error("Perfil não encontrado.");

          let invoices: Record<string, unknown>[] = [];
          if (profile.billing_provider === "asaas" && profile.billing_subscription_id) {
            const pagamentos = await listarPagamentosAsaas(profile.billing_subscription_id);
            invoices = pagamentos.filter(
              (item): item is Record<string, unknown> => !!item && typeof item === "object",
            );
            for (const payment of invoices) {
              const paymentId = typeof payment["id"] === "string" ? payment["id"] : null;
              if (!paymentId) continue;
              await (supabaseAdmin as any).from("billing_invoices").upsert(
                {
                  owner_id: user.id,
                  provider: "asaas",
                  provider_payment_id: paymentId,
                  provider_subscription_id: profile.billing_subscription_id,
                  tier: profile.subscription_tier,
                  status: String(payment["status"] ?? "UNKNOWN"),
                  amount: typeof payment["value"] === "number" ? payment["value"] : null,
                  due_date: typeof payment["dueDate"] === "string" ? payment["dueDate"] : null,
                  paid_at:
                    typeof payment["paymentDate"] === "string" ? payment["paymentDate"] : null,
                  invoice_url:
                    typeof payment["invoiceUrl"] === "string" ? payment["invoiceUrl"] : null,
                },
                { onConflict: "provider_payment_id" },
              );
            }
          }

          return json({
            subscription: {
              tier: profile.subscription_tier,
              status: profile.subscription_status,
              cancelAtPeriodEnd: profile.billing_cancel_at_period_end,
              currentPeriodEnd: profile.billing_current_period_end,
            },
            invoices: invoices.map((payment) => ({
              id: payment["id"],
              status: payment["status"],
              value: payment["value"],
              dueDate: payment["dueDate"],
              paymentDate: payment["paymentDate"],
              invoiceUrl: payment["invoiceUrl"],
            })),
          });
        } catch (error) {
          console.error("[Asaas manage]", error);
          return json({ error: "Não foi possível carregar suas cobranças." }, 503);
        }
      },
    },
  },
});
