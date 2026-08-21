import { createFileRoute } from "@tanstack/react-router";
import { cancelarAssinaturaAsaas } from "@/lib/nexa/asaas.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export const Route = createFileRoute("/api/billing/asaas/cancel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
          if (!token) return json({ error: "Sua sessão expirou." }, 401);
          const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(token);
          if (authError || !auth.user) return json({ error: "Sua sessão expirou." }, 401);
          const { data: profile, error } = await supabaseAdmin
            .from("profiles")
            .select("billing_provider,billing_subscription_id,subscription_status")
            .eq("id", auth.user.id)
            .single();
          if (error || !profile?.billing_subscription_id || profile.billing_provider !== "asaas")
            return json({ error: "Nenhuma assinatura Asaas ativa foi encontrada." }, 404);
          const subscription = await cancelarAssinaturaAsaas(profile.billing_subscription_id);
          const due =
            typeof subscription["nextDueDate"] === "string" ? subscription["nextDueDate"] : null;
          const end = due && /^\d{4}-\d\d-\d\d$/.test(due) ? `${due}T23:59:59.999Z` : null;
          await (supabaseAdmin as any)
            .from("profiles")
            .update({
              billing_cancel_at_period_end: true,
              billing_current_period_end: end,
              billing_updated_at: new Date().toISOString(),
            })
            .eq("id", auth.user.id);
          return json({ currentPeriodEnd: end });
        } catch (error) {
          console.error("[Asaas cancel]", error);
          return json({ error: "Não foi possível cancelar a assinatura agora." }, 503);
        }
      },
    },
  },
});
