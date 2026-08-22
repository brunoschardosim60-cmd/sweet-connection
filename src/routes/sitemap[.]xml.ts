import { createFileRoute } from "@tanstack/react-router";

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

function publicOrigin(request: Request) {
  const configured = process.env["PUBLIC_SITE_URL"] ?? process.env["VITE_PUBLIC_SITE_URL"];
  return (configured || new URL(request.url).origin).replace(/\/+$/, "");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date().toISOString();
        const { data, error } = await supabaseAdmin
          .from("minisites")
          .select("slug, updated_at")
          .eq("status", "publicado")
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .order("updated_at", { ascending: false })
          .limit(50000);

        if (error) {
          console.error("[sitemap]", error);
          return new Response("Não foi possível gerar o sitemap.", { status: 503 });
        }

        const origin = publicOrigin(request);
        const urls = [
          `<url><loc>${escapeXml(`${origin}/`)}</loc></url>`,
          ...(data ?? []).map((site) => {
            const lastmod = site.updated_at
              ? `<lastmod>${escapeXml(new Date(site.updated_at).toISOString())}</lastmod>`
              : "";
            return `<url><loc>${escapeXml(`${origin}/site/${site.slug}`)}</loc>${lastmod}</url>`;
          }),
        ];
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}\n</urlset>`;

        return new Response(body, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, s-maxage=3600, max-age=300",
          },
        });
      },
    },
  },
});
