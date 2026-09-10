import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/notifications/push")({
  server: {
    handlers: {
      GET: async ({ request }) => (await import("@/lib/nexa/push.server")).assinaturaPush(request),
      POST: async ({ request }) => (await import("@/lib/nexa/push.server")).assinaturaPush(request),
    },
  },
});
