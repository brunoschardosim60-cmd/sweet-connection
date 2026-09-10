import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/stores/accept")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { aceitarEntregaLoja } = await import("@/lib/nexa/entrega-loja.server");
        return aceitarEntregaLoja(request);
      },
    },
  },
});
