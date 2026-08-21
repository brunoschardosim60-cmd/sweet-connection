import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Tipo = "formulario" | "agendamento" | "reserva";
const tipos = new Set<Tipo>(["formulario", "agendamento", "reserva"]);

function textoSeguro(value: unknown) {
  return String(value ?? "").replace(/[<>]/g, "").slice(0, 5000);
}

async function enviarEmail(destino: string, assunto: string, mensagem: string) {
  const key = process.env["RESEND_API_KEY"];
  const from = process.env["NOTIFICATION_EMAIL_FROM"];
  if (!key || !from) return { status: "skipped", reason: "email_not_configured" } as const;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [destino], subject: assunto, text: mensagem }),
  });
  if (!response.ok) throw new Error(`Resend respondeu ${response.status}`);
  return { status: "sent" } as const;
}

async function enviarWhatsapp(destino: string, mensagem: string) {
  const token = process.env["WHATSAPP_ACCESS_TOKEN"];
  const phoneId = process.env["WHATSAPP_PHONE_NUMBER_ID"];
  const to = destino.replace(/\D/g, "");
  if (!token || !phoneId || !to) return { status: "skipped", reason: "whatsapp_not_configured" } as const;
  const response = await fetch(`https://graph.facebook.com/v22.0/${encodeURIComponent(phoneId)}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: mensagem } }),
  });
  if (!response.ok) throw new Error(`WhatsApp respondeu ${response.status}`);
  return { status: "sent" } as const;
}

export const Route = createFileRoute("/api/notifications/dispatch")({
  server: { handlers: { POST: async ({ request }) => {
    try {
      const body = (await request.json()) as { type?: unknown; id?: unknown };
      const type = body.type as Tipo;
      const id = typeof body.id === "string" ? body.id : "";
      if (!tipos.has(type) || !/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Solicitação inválida." }, { status: 400 });

      const table = type === "formulario" ? "form_submissions" : type === "agendamento" ? "agendamentos" : "reservas_hospedagem";
      const { data: source, error } = await (supabaseAdmin as any).from(table).select("*").eq("id", id).maybeSingle();
      if (error || !source) return Response.json({ error: "Item não encontrado." }, { status: 404 });
      const { data: site } = await supabaseAdmin.from("minisites").select("owner_id,slug,published_content").eq("id", source.minisite_id).maybeSingle();
      if (!site) return Response.json({ error: "Mini-site não encontrado." }, { status: 404 });
      const delivery = await (supabaseAdmin as any).from("notification_deliveries")
        .insert({ source_type: type, source_id: id, channel: "email" }).select("id").maybeSingle();
      if (delivery.error?.code === "23505") return Response.json({ status: "already_processed" }, { status: 202 });
      if (delivery.error) throw delivery.error;
      const { data: owner } = await supabaseAdmin.auth.admin.getUserById(site.owner_id);
      const email = owner.user?.email;
      if (!email) throw new Error("Destinatário não encontrado.");
      const resumo = type === "formulario"
        ? `Novo formulário em /site/${site.slug}\n\n${JSON.stringify(source.payload ?? {}, null, 2)}`
        : type === "agendamento"
          ? `Novo agendamento em /site/${site.slug}\n${textoSeguro(source.nome)} — ${textoSeguro(source.data)} às ${textoSeguro(source.hora)}`
          : `Nova reserva em /site/${site.slug}\n${textoSeguro(source.nome)} — ${textoSeguro(source.check_in)} até ${textoSeguro(source.check_out)} · ${textoSeguro(source.hospedes)} hóspede(s)`;
      const result = await enviarEmail(email, `Nexa: nova ${type} no seu mini-site`, resumo);
      await (supabaseAdmin as any).from("notification_deliveries").update({
        status: result.status, last_error: "reason" in result ? result.reason : null,
        sent_at: result.status === "sent" ? new Date().toISOString() : null,
      }).eq("id", delivery.data.id);
      const whatsapp = (site.published_content as any)?.conteudo?.whatsapp;
      const whatsappDelivery = await (supabaseAdmin as any).from("notification_deliveries")
        .insert({ source_type: type, source_id: id, channel: "whatsapp" }).select("id").maybeSingle();
      if (whatsappDelivery.data) {
        try {
          const whatsResult = await enviarWhatsapp(String(whatsapp ?? ""), resumo);
          await (supabaseAdmin as any).from("notification_deliveries").update({
            status: whatsResult.status, last_error: "reason" in whatsResult ? whatsResult.reason : null,
            sent_at: whatsResult.status === "sent" ? new Date().toISOString() : null,
          }).eq("id", whatsappDelivery.data.id);
        } catch (whatsappError) {
          await (supabaseAdmin as any).from("notification_deliveries").update({ status: "failed", last_error: textoSeguro(whatsappError) }).eq("id", whatsappDelivery.data.id);
        }
      }
      return Response.json(result, { status: 200 });
    } catch (error) {
      console.error("[Nexa notification]", error);
      return Response.json({ error: "Não foi possível encaminhar a notificação." }, { status: 503 });
    }
  } } },
});
