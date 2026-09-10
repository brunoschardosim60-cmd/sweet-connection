import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

/** Apenas URLs públicas do nosso bucket; nunca faz fetch de URLs arbitrárias. */
export function midiasDaEntrega(pacote: unknown, supabaseUrl: string) {
  const base = new URL(supabaseUrl);
  const prefixos = [
    "/storage/v1/object/public/nexa-media/",
    "/storage/v1/render/image/public/nexa-media/",
  ];
  const encontrados = new Map<string, string>();
  const visitar = (valor: unknown) => {
    if (typeof valor === "string") {
      let url: URL;
      try {
        url = new URL(valor);
      } catch {
        return;
      }
      if (url.origin !== base.origin) return;
      const prefixo = prefixos.find((p) => url.pathname.startsWith(p));
      if (!prefixo) return;
      const caminho = decodeURIComponent(url.pathname.slice(prefixo.length));
      if (
        !caminho ||
        caminho.split("/").some((p) => !p || p === "." || p === "..") ||
        caminho.includes("\\")
      )
        throw new Error("invalid_media");
      encontrados.set(valor, caminho);
    } else if (Array.isArray(valor)) valor.forEach(visitar);
    else if (valor && typeof valor === "object") Object.values(valor).forEach(visitar);
  };
  visitar(pacote);
  if (new Set(encontrados.values()).size > 300) throw new Error("too_many_media");
  return encontrados;
}

export async function aceitarEntregaLoja(request: Request) {
  const origem = request.headers.get("origin");
  if (origem && origem !== new URL(request.url).origin)
    return Response.json({ error: "not_allowed" }, { status: 403 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "authentication_required" }, { status: 401 });
  const bruto = await request.text();
  if (bruto.length > 300) return Response.json({ error: "invalid_invitation" }, { status: 400 });
  let convite: string;
  try {
    const json = JSON.parse(bruto) as { convite?: unknown };
    if (
      typeof json?.convite !== "string" ||
      !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(json.convite)
    )
      throw new Error();
    convite = json.convite;
  } catch {
    return Response.json({ error: "invalid_invitation" }, { status: 400 });
  }
  try {
    const { data: auth, error: erroAuth } = await supabaseAdmin.auth.getUser(token);
    if (erroAuth || !auth.user || !auth.user.email_confirmed_at)
      return Response.json({ error: "authentication_required" }, { status: 401 });
    const usuario = auth.user.id;
    const { data: limite, error: erroLimite } = await supabaseAdmin.rpc("nexa_limite_cotacao", {
      chave: `entrega-loja:${usuario}`,
      limite: 6,
      segundos: 3600,
    });
    if (erroLimite) throw erroLimite;
    if (!limite) return Response.json({ error: "rate_limit_exceeded" }, { status: 429 });
    const { data: preparado, error: erroPreparar } = await supabaseAdmin.rpc(
      "nexa_entrega_preparar",
      { convite, usuario },
    );
    if (erroPreparar) throw erroPreparar;
    const dados = preparado as unknown as {
      aceita?: boolean;
      siteId: string;
      pacote: Json;
      revisao: string;
    };
    if (dados.aceita)
      return Response.json(
        { siteId: dados.siteId, aceita: true },
        { headers: { "cache-control": "no-store" } },
      );
    const base = process.env["SUPABASE_URL"];
    if (!base) throw new Error("service_unavailable");
    const midias = midiasDaEntrega(dados.pacote, base);
    const mapa: Record<string, string> = {};
    const destinos = new Map<string, string>();
    let total = 0;
    // Caminhos determinísticos tornam retries seguros; a origem e sua biblioteca ficam intactas.
    for (const [url, origemArquivo] of midias) {
      let destino = destinos.get(origemArquivo);
      if (!destino) {
        const extensao = origemArquivo.match(/\.[a-z0-9]{1,8}$/i)?.[0] ?? "";
        destino = `${usuario}/entregas/${convite}/${createHash("sha256").update(origemArquivo).digest("hex")}${extensao}`;
        const bucket = supabaseAdmin.storage.from("nexa-media");
        const { data: arquivo, error: erroArquivo } = await bucket.download(origemArquivo);
        if (erroArquivo || !arquivo) throw new Error("media_copy_failed");
        total += arquivo.size;
        if (total > 500 * 1024 * 1024 || arquivo.size > 10 * 1024 * 1024)
          throw new Error("too_many_media");
        const upload = await bucket.upload(destino, arquivo, {
          upsert: false,
          contentType: arquivo.type,
          cacheControl: "31536000",
        });
        if (upload.error && !/already exists|duplicate/i.test(upload.error.message))
          throw new Error("media_copy_failed");
        const registro = await supabaseAdmin.from("media").upsert(
          {
            owner_id: usuario,
            bucket: "nexa-media",
            object_path: destino,
            mime_type: arquivo.type || "application/octet-stream",
            size_bytes: arquivo.size,
            original_name: origemArquivo.split("/").at(-1) ?? "Imagem recebida",
          },
          { onConflict: "object_path", ignoreDuplicates: true },
        );
        if (registro.error) throw new Error("media_copy_failed");
        destinos.set(origemArquivo, destino);
      }
      mapa[url] = supabaseAdmin.storage.from("nexa-media").getPublicUrl(destino).data.publicUrl;
    }
    const result = await supabaseAdmin.rpc("nexa_entrega_finalizar", {
      convite,
      usuario,
      revisao: dados.revisao,
      mapa,
    });
    if (result.error) throw result.error;
    return Response.json(result.data, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const mensagem = (error as { message?: string })?.message ?? "";
    const conhecidos = [
      "not_allowed",
      "invitation_unavailable",
      "subscription_required",
      "plan_upgrade_required",
      "minisite_creation_limit_reached",
      "site_changed",
      "account_unavailable",
      "media_copy_failed",
      "too_many_media",
      "invalid_media",
    ];
    const codigo = conhecidos.find((c) => mensagem.includes(c)) ?? "service_unavailable";
    return Response.json(
      { error: codigo },
      {
        status: codigo === "not_allowed" ? 403 : codigo === "service_unavailable" ? 503 : 409,
        headers: { "cache-control": "no-store" },
      },
    );
  }
}
