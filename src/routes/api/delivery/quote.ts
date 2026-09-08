import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/delivery/quote")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { cotarEntrega } = await import("@/lib/nexa/entrega.server");
        return cotarEntrega(request);
      },
    },
  },
});
