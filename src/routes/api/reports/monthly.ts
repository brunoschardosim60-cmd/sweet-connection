import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function texto(numero: number) {
  return new Intl.NumberFormat("pt-BR").format(numero);
}

function inicioDoMesAnterior() {
  const hoje = new Date();
  return new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 1, 1));
}

function fimDoMesAnterior() {
  const hoje = new Date();
  return new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));
}

async function enviar(destino: string, assunto: string, mensagem: string) {
  const key = process.env["RESEND_API_KEY"];
  const from = process.env["NOTIFICATION_EMAIL_FROM"];
  if (!key || !from) throw new Error("email_not_configured");
  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [destino], subject: assunto, text: mensagem }),
  });
  if (!resposta.ok) throw new Error(`email_provider_${resposta.status}`);
}

/** Endpoint para Cron. Nunca é chamado pelo navegador e exige CRON_SECRET. */
export const Route = createFileRoute("/api/reports/monthly")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
          return Response.json({ error: "Não autorizado." }, { status: 401 });
        if (!process.env["RESEND_API_KEY"] || !process.env["NOTIFICATION_EMAIL_FROM"])
          return Response.json({ error: "E-mail transacional não configurado." }, { status: 503 });

        const inicio = inicioDoMesAnterior();
        const fim = fimDoMesAnterior();
        const referencia = inicio.toISOString().slice(0, 10);
        const [sitesResult, eventosResult, formulariosResult, pedidosResult] = await Promise.all([
          supabaseAdmin.from("minisites").select("id,owner_id,status"),
          supabaseAdmin
            .from("analytics_events")
            .select("minisite_id,event_type,occurred_at")
            .gte("occurred_at", inicio.toISOString())
            .lt("occurred_at", fim.toISOString()),
          supabaseAdmin
            .from("form_submissions")
            .select("minisite_id,created_at")
            .gte("created_at", inicio.toISOString())
            .lt("created_at", fim.toISOString()),
          supabaseAdmin
            .from("pedidos_cardapio")
            .select("minisite_id,total,status,created_at")
            .gte("created_at", inicio.toISOString())
            .lt("created_at", fim.toISOString()),
        ]);
        if (
          sitesResult.error ||
          eventosResult.error ||
          formulariosResult.error ||
          pedidosResult.error
        )
          throw new Error("Não foi possível consolidar o relatório mensal.");

        const donos = new Map<string, string[]>();
        for (const site of sitesResult.data ?? []) {
          const lista = donos.get(site.owner_id) ?? [];
          lista.push(site.id);
          donos.set(site.owner_id, lista);
        }
        let enviados = 0;
        for (const [ownerId, ids] of donos) {
          const existente = await supabaseAdmin
            .from("monthly_reports")
            .select("id")
            .eq("owner_id", ownerId)
            .eq("reference_month", referencia)
            .maybeSingle();
          if (existente.data) continue;
          const idSet = new Set(ids);
          const visitas = (eventosResult.data ?? []).filter(
            (e) => idSet.has(e.minisite_id) && e.event_type === "visita",
          ).length;
          const contatos = (formulariosResult.data ?? []).filter((e) =>
            idSet.has(e.minisite_id),
          ).length;
          const pedidos = (pedidosResult.data ?? []).filter(
            (p) => idSet.has(p.minisite_id) && p.status !== "cancelado",
          );
          const faturamento = pedidos.reduce((s, p) => s + Number(p.total), 0);
          const usuario = await supabaseAdmin.auth.admin.getUserById(ownerId);
          if (!usuario.data.user?.email) continue;
          await enviar(
            usuario.data.user.email,
            "Nexa: seu resumo mensal",
            `Resumo do período ${referencia}\n\nVisitas: ${texto(visitas)}\nContatos: ${texto(contatos)}\nPedidos: ${texto(pedidos.length)}\nFaturamento de pedidos: R$ ${faturamento.toFixed(2).replace(".", ",")}\n\nAcesse seu painel Nexa para ver os detalhes.`,
          );
          const { error } = await supabaseAdmin.from("monthly_reports").insert({
            owner_id: ownerId,
            reference_month: referencia,
            payload: { visitas, contatos, pedidos: pedidos.length, faturamento },
          });
          if (error) throw error;
          enviados++;
        }
        return Response.json({ ok: true, referenceMonth: referencia, enviados });
      },
    },
  },
});
