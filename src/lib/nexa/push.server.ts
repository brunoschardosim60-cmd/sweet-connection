import webpush from "web-push";
import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assinaturaPushSchema, endpointPushSeguro } from "./push-validation";

const db = supabaseAdmin as unknown as SupabaseClient;
export function configuracaoPush() {
  const publicKey = process.env["WEB_PUSH_PUBLIC_KEY"];
  const privateKey = process.env["WEB_PUSH_PRIVATE_KEY"];
  const subject = process.env["WEB_PUSH_SUBJECT"];
  return publicKey && privateKey && subject && process.env["PUSH_DISPATCH_SECRET"]
    ? { publicKey, privateKey, subject }
    : null;
}
export async function assinaturaPush(request: Request) {
  const config = configuracaoPush();
  if (request.method === "GET")
    return Response.json(
      { publicKey: config?.publicKey ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return Response.json({ error: "Entre novamente." }, { status: 401 });
  const { data: auth, error } = await db.auth.getUser(token);
  if (error || !auth.user) return Response.json({ error: "Entre novamente." }, { status: 401 });
  const raw = await request.text();
  if (raw.length > 5000) return Response.json({ error: "Solicitação inválida." }, { status: 400 });
  let parsed;
  try {
    parsed = assinaturaPushSchema.safeParse(JSON.parse(raw));
  } catch {
    return Response.json({ error: "Solicitação inválida." }, { status: 400 });
  }
  if (!parsed.success)
    return Response.json(
      { error: "Assinatura inválida ou navegador não suportado." },
      { status: 400 },
    );
  const { action, site, subscription } = parsed.data;
  if (action === "enable" && !config)
    return Response.json(
      { error: "Web Push ainda não foi configurado pelo administrador." },
      { status: 503 },
    );
  const r = await db.rpc("nexa_push_subscription", {
    requested_user: auth.user.id,
    requested_site: site,
    requested_action: action,
    requested_endpoint: subscription.endpoint,
    requested_keys: subscription.keys,
  });
  if (r.error)
    return Response.json(
      {
        error: r.error.message.includes("device_other_account")
          ? "Este navegador tem avisos de outra conta. Desative-os nessa conta antes de ativar aqui."
          : "Não foi possível alterar os avisos. Confira seu acesso à loja.",
      },
      { status: 403 },
    );
  return Response.json({ active: r.data }, { headers: { "Cache-Control": "no-store" } });
}

export async function processarPush(request: Request) {
  const secret = process.env["PUSH_DISPATCH_SECRET"];
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (
    !secret ||
    Buffer.byteLength(auth) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(auth), Buffer.from(expected))
  )
    return new Response(null, { status: 401 });
  const config = configuracaoPush();
  if (!config) return Response.json({ error: "push_not_configured" }, { status: 503 });
  const claimed = await db.rpc("nexa_push_claim");
  if (claimed.error) return new Response(null, { status: 503 });
  let sent = 0;
  await Promise.all(
    (claimed.data ?? []).map(
      async (job: {
        id: string;
        device_id: string;
        site_id: string;
        source_type: string;
        attempts: number;
        created_at: string;
      }) => {
        try {
          const [device, site, enabled] = await Promise.all([
            db
              .from("nexa_push_devices")
              .select("user_id,endpoint,keys")
              .eq("id", job.device_id)
              .maybeSingle(),
            db.from("minisites").select("owner_id").eq("id", job.site_id).maybeSingle(),
            db
              .from("nexa_push_stores")
              .select("device_id")
              .eq("device_id", job.device_id)
              .eq("site_id", job.site_id)
              .maybeSingle(),
          ]);
          if (device.error || site.error || enabled.error) throw new Error("lookup_failed");
          let allowed =
            !!device.data &&
            !!site.data &&
            !!enabled.data &&
            site.data.owner_id === device.data.user_id;
          if (!allowed && device.data && site.data && enabled.data) {
            const member = await db
              .from("minisite_operadores")
              .select("user_id")
              .eq("minisite_id", job.site_id)
              .eq("user_id", device.data.user_id)
              .maybeSingle();
            if (member.error) throw new Error("lookup_failed");
            allowed = !!member.data;
          }
          if (
            !allowed ||
            !device.data ||
            !endpointPushSeguro(device.data.endpoint) ||
            Date.now() - Date.parse(job.created_at) > 86400000
          ) {
            await db.from("nexa_push_jobs").update({ status: "skipped" }).eq("id", job.id);
            return;
          }
          await webpush.sendNotification(
            { endpoint: device.data.endpoint, keys: device.data.keys },
            JSON.stringify({
              title: "Nexa — novo atendimento",
              body:
                job.source_type === "pedido"
                  ? "Um pedido aguarda sua atenção. Abra a operação da loja."
                  : "Há um novo atendimento. Abra a operação da loja.",
              url: `/operacao?site=${job.site_id}`,
              tag: `nexa-${job.id}`,
            }),
            { vapidDetails: config, TTL: 3600, timeout: 8000, urgency: "high" },
          );
          const updated = await db
            .from("nexa_push_jobs")
            .update({ status: "sent" })
            .eq("id", job.id);
          if (updated.error) throw new Error("update_failed");
          sent++;
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410)
            await db.from("nexa_push_devices").delete().eq("id", job.device_id);
          else
            await db
              .from("nexa_push_jobs")
              .update({
                status: job.attempts >= 6 ? "failed" : "pending",
                available_at: new Date(Date.now() + 60000 * 2 ** job.attempts).toISOString(),
              })
              .eq("id", job.id);
        }
      },
    ),
  );
  return Response.json({ processed: claimed.data?.length ?? 0, sent });
}
