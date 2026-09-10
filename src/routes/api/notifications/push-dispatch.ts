import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/notifications/push-dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => (await import("@/lib/nexa/push.server")).processarPush(request),
    },
  },
});
