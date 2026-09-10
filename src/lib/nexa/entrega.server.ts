import { createHash } from "node:crypto";
import type { Site } from "./types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export function precoPorDistancia(site: Site, metros: number) {
  if (!Number.isFinite(metros) || metros < 0) throw new Error("address_not_found");
  const faixas = site.comercio?.faixasDistancia ?? [];
  if (
    !faixas.length ||
    faixas.length > 20 ||
    faixas.some(
      (f) =>
        !Number.isFinite(f.ateKm) ||
        f.ateKm <= 0 ||
        f.ateKm > 200 ||
        !Number.isFinite(f.taxa) ||
        f.taxa < 0 ||
        f.taxa > 100000,
    )
  )
    throw new Error("delivery_not_configured");
  const faixa = [...faixas].sort((a, b) => a.ateKm - b.ateKm).find((f) => metros <= f.ateKm * 1000);
  if (!faixa) throw new Error("outside_delivery_area");
  return Math.round(faixa.taxa * 100) / 100;
}
export async function cotarEntrega(request: Request) {
  const origem = request.headers.get("origin");
  if (origem && origem !== new URL(request.url).origin)
    return Response.json({ error: "not_allowed" }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 2500) return Response.json({ error: "invalid_address" }, { status: 400 });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalid_address" }, { status: 400 });
  }
  if (!body || typeof body !== "object")
    return Response.json({ error: "invalid_address" }, { status: 400 });
  const slug = typeof body["slug"] === "string" ? body["slug"].trim() : "";
  const endereco = typeof body["endereco"] === "string" ? body["endereco"].trim() : "";
  const bairro = typeof body["bairro"] === "string" ? body["bairro"].trim() : "";
  if (
    !/^[a-z0-9-]{3,48}$/.test(slug) ||
    endereco.length < 8 ||
    endereco.length > 240 ||
    bairro.length > 120
  )
    return Response.json({ error: "invalid_address" }, { status: 400 });
  try {
    const key = process.env["GOOGLE_MAPS_API_KEY"];
    if (!key) throw new Error("delivery_not_configured");
    const { data, error } = await supabaseAdmin.rpc("get_published_minisite", {
      requested_slug: slug,
    });
    if (error || !data) return Response.json({ error: "minisite_not_found" }, { status: 404 });
    const site = data as unknown as Site;
    if (site.comercio?.calculoEntrega !== "distancia" || !site.comercio.enderecoOrigem?.trim())
      throw new Error("delivery_not_configured");
    // A identidade vem da linha do banco, não de um campo editável do snapshot.
    const { data: registro, error: erroRegistro } = await supabaseAdmin
      .from("minisites")
      .select("id")
      .eq("slug", slug)
      .single();
    if (erroRegistro || !registro) throw new Error("delivery_unavailable");
    const siteId = registro.id;
    // A origem de rede da Vercel é atribuída pelo proxy, nunca um campo do formulário.
    const ip =
      request.headers.get("x-vercel-forwarded-for") ??
      request.headers.get("x-forwarded-for")?.split(",")[0] ??
      "local";
    const hash = createHash("sha256").update(ip).digest("hex");
    for (const [chave, limite, segundos] of [
      [`ip:${hash}`, 8, 60],
      [`site:${siteId}`, 200, 3600],
      ["global", 2000, 86400],
    ] as const) {
      const result = await supabaseAdmin.rpc("nexa_limite_cotacao", { chave, limite, segundos });
      if (result.error) throw new Error("delivery_unavailable");
      if (!result.data) return Response.json({ error: "rate_limit_exceeded" }, { status: 429 });
    }
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        "content-type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.distanceMeters,geocodingResults",
      },
      body: JSON.stringify({
        origin: { address: site.comercio.enderecoOrigem },
        destination: { address: [endereco, bairro, "Brasil"].filter(Boolean).join(", ") },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        languageCode: "pt-BR",
        units: "METRIC",
      }),
    });
    if (!response.ok) throw new Error("delivery_unavailable");
    const route = (await response.json()) as {
      routes?: { distanceMeters?: number }[];
      geocodingResults?: {
        origin?: { partialMatch?: boolean; geocoderStatus?: { code?: number } };
        destination?: { partialMatch?: boolean; geocoderStatus?: { code?: number } };
      };
    };
    if (
      route.geocodingResults?.origin?.partialMatch ||
      route.geocodingResults?.origin?.geocoderStatus?.code
    )
      throw new Error("delivery_origin_ambiguous");
    if (
      route.geocodingResults?.destination?.partialMatch ||
      route.geocodingResults?.destination?.geocoderStatus?.code
    )
      throw new Error("address_ambiguous");
    const metros = route.routes?.[0]?.distanceMeters;
    if (typeof metros !== "number") throw new Error("address_not_found");
    const taxa = precoPorDistancia(site, metros);
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from("cotacoes_entrega")
      .insert({
        minisite_id: siteId,
        endereco,
        bairro,
        configuracao: JSON.parse(JSON.stringify(site.comercio)),
        taxa,
      })
      .select("id,expires_at")
      .single();
    if (quoteError || !quote) throw new Error("delivery_unavailable");
    return Response.json(
      {
        id: quote.id,
        taxa,
        distanciaKm: Math.round(metros / 10) / 100,
        expiraEm: quote.expires_at,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const codigo = error instanceof Error ? error.message : "delivery_unavailable";
    const permitidos = [
      "outside_delivery_area",
      "address_not_found",
      "delivery_not_configured",
      "address_ambiguous",
      "delivery_origin_ambiguous",
    ];
    return Response.json(
      { error: permitidos.includes(codigo) ? codigo : "delivery_unavailable" },
      { status: permitidos.includes(codigo) ? 422 : 503 },
    );
  }
}
