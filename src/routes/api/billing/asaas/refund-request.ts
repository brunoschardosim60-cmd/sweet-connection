import { createFileRoute } from "@tanstack/react-router";
import { listarPagamentosAsaas } from "@/lib/nexa/asaas.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/* eslint-disable @typescript-eslint/no-explicit-any -- table is added by the paired migration. */

const json = (body: unknown, status = 200) => Response.json(body, { status });

export const Route = createFileRoute("/api/billing/asaas/refund-request")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
          if (!token) return json({ error: "Sua sessão expirou." }, 401);
          const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(token);
          if (authError || !auth.user) return json({ error: "Sua sessão expirou." }, 401);

          const body = (await request.json().catch(() => null)) as { reason?: unknown } | null;
          const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
          if (reason.length < 10 || reason.length > 500)
            return json({ error: "Explique o motivo do pedido entre 10 e 500 caracteres." }, 400);

          const { data: profile, error: profileError } = await (supabaseAdmin as any)
            .from("profiles")
            .select("billing_provider,billing_subscription_id,billing_cancel_at_period_end")
            .eq("id", auth.user.id)
            .single();
          if (
            profileError ||
            !profile?.billing_subscription_id ||
            profile.billing_provider !== "asaas"
          )
            return json({ error: "Nenhuma assinatura Asaas foi encontrada." }, 404);
          if (!profile.billing_cancel_at_period_end)
            return json({ error: "Cancele a renovação antes de solicitar um reembolso." }, 400);

          const payments = await listarPagamentosAsaas(profile.billing_subscription_id);
          const payment = payments
            .filter(
              (item): item is Record<string, unknown> =>
                !!item &&
                typeof item === "object" &&
                ["RECEIVED", "CONFIRMED"].includes(String(item["status"])) &&
                typeof item["id"] === "string" &&
                typeof item["value"] === "number" &&
                item["value"] > 0,
            )
            .sort((a, b) =>
              String(b["paymentDate"] ?? b["confirmedDate"] ?? b["dueDate"] ?? "").localeCompare(
                String(a["paymentDate"] ?? a["confirmedDate"] ?? a["dueDate"] ?? ""),
              ),
            )[0];
          if (!payment)
            return json(
              { error: "Não há pagamento confirmado elegível para análise de reembolso." },
              400,
            );

          const { data: existing } = await (supabaseAdmin as any)
            .from("billing_refund_requests")
            .select("id,status,requested_at")
            .eq("provider", "asaas")
            .eq("provider_payment_id", payment["id"])
            .maybeSingle();
          if (existing) return json({ request: existing, alreadyExists: true });

          const { data: refundRequest, error: insertError } = await (supabaseAdmin as any)
            .from("billing_refund_requests")
            .insert({
              owner_id: auth.user.id,
              provider: "asaas",
              provider_payment_id: payment["id"],
              amount: payment["value"],
              reason,
            })
            .select("id,status,requested_at,amount")
            .single();
          if (insertError) throw insertError;
          return json({ request: refundRequest });
        } catch (error) {
          console.error("[Asaas refund request]", error);
          return json({ error: "Não foi possível registrar o pedido de reembolso agora." }, 503);
        }
      },
    },
  },
});
