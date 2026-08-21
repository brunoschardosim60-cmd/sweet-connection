import { createFileRoute } from "@tanstack/react-router";
import { criarCheckoutAsaas, planoPago } from "@/lib/nexa/asaas.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function siteUrl(request: Request) {
  const configured = process.env["PUBLIC_SITE_URL"] ?? process.env["VITE_PUBLIC_SITE_URL"];
  return (configured || new URL(request.url).origin).replace(/\/$/, "");
}

export const Route = createFileRoute("/api/billing/asaas/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
          if (!token) return json({ error: "Entre novamente para contratar um plano." }, 401);
          const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(token);
          if (authError || !auth.user)
            return json({ error: "Sua sessão expirou. Entre novamente." }, 401);

          const body = (await request.json().catch(() => null)) as { tier?: unknown } | null;
          const tier = planoPago(body?.tier);
          if (!tier) return json({ error: "Plano inválido." }, 400);

          // A condição é decidida no servidor: somente quem ainda não teve
          // um checkout pago da Nexa recebe o primeiro mês promocional.
          const { count: comprasPagas, error: comprasError } = await supabaseAdmin
            .from("billing_checkout_sessions")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", auth.user.id)
            .eq("provider", "asaas")
            .eq("status", "paid");
          if (comprasError) throw new Error("Não foi possível verificar sua elegibilidade.");
          const elegivelBoasVindas = comprasPagas === 0;

          const { data: session, error: sessionError } = await supabaseAdmin
            .from("billing_checkout_sessions")
            .insert({ owner_id: auth.user.id, provider: "asaas", tier })
            .select("id")
            .single();
          if (sessionError || !session) throw new Error("Não foi possível preparar seu checkout.");

          try {
            const callback = `${siteUrl(request)}/painel/meu-plano?checkout=asaas`;
            const checkout = await criarCheckoutAsaas({
              sessionId: session.id,
              tier,
              callbackUrl: callback,
              elegivelBoasVindas,
            });
            const { error: updateError } = await supabaseAdmin
              .from("billing_checkout_sessions")
              .update({ provider_checkout_id: checkout.id, status: "pending" })
              .eq("id", session.id);
            if (updateError) throw new Error("Não foi possível registrar o checkout.");
            return json({ url: checkout.url });
          } catch (error) {
            await supabaseAdmin.from("billing_checkout_sessions").delete().eq("id", session.id);
            throw error;
          }
        } catch (error) {
          console.error("[Asaas checkout]", error);
          return json(
            { error: "Não foi possível iniciar o pagamento. Tente novamente em instantes." },
            503,
          );
        }
      },
    },
  },
});
