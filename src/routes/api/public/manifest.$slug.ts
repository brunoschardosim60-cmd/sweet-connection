import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Site } from "@/lib/nexa/types";

/**
 * Manifest dinâmico do mini-site publicado: permite salvar a página na tela
 * inicial do celular com o nome, o ícone e as cores do próprio negócio.
 */
export const Route = createFileRoute("/api/public/manifest/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!url || !key) return new Response("Indisponível", { status: 503 });

        const supabase = createClient<Database>(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
                h.delete("Authorization");
              }
              h.set("apikey", key);
              return fetch(input, { ...init, headers: h });
            },
          },
        });

        const { data, error } = await supabase.rpc("get_published_minisite", {
          requested_slug: params.slug,
        });
        if (error || !data) return new Response("Não encontrado", { status: 404 });

        const site = data as unknown as Site;
        const icone = site.conteudo.logo || site.conteudo.capa || site.seo.imagem || "";

        const manifest = {
          name: site.conteudo.nome,
          short_name: site.conteudo.nome.slice(0, 12),
          description: site.seo.descricao || site.conteudo.descricao,
          start_url: `/site/${site.slug}`,
          scope: `/site/${site.slug}`,
          display: "standalone",
          background_color: site.aparencia.corFundo,
          theme_color: site.aparencia.corPrimaria,
          icons: icone
            ? [
                { src: icone, sizes: "192x192", type: "image/png", purpose: "any" },
                { src: icone, sizes: "512x512", type: "image/png", purpose: "any" },
              ]
            : [],
        };

        return new Response(JSON.stringify(manifest), {
          headers: {
            "content-type": "application/manifest+json; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
        });
      },
    },
  },
});
