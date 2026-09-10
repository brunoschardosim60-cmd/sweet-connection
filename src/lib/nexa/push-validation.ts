import { z } from "zod";

// An endpoint is untrusted input, never an arbitrary server-side fetch target.
export function endpointPushSeguro(value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.port &&
      !u.username &&
      !u.password &&
      !u.hash &&
      (u.hostname === "fcm.googleapis.com" ||
        u.hostname === "updates.push.services.mozilla.com" ||
        u.hostname === "web.push.apple.com" ||
        /^[a-z0-9-]+\.notify\.windows\.com$/.test(u.hostname))
    );
  } catch {
    return false;
  }
}
export const assinaturaPushSchema = z.object({
  site: z.string().uuid(),
  action: z.enum(["status", "enable", "disable"]),
  subscription: z.object({
    endpoint: z.string().max(2048).refine(endpointPushSeguro),
    keys: z.object({
      p256dh: z.string().regex(/^[\w-]{87}=?$/),
      auth: z.string().regex(/^[\w-]{22}(==)?$/),
    }),
  }),
});
