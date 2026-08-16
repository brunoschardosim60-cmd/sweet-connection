import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const cleanupSecret = request.headers.get("x-nexa-cleanup-secret");
  if (!cleanupSecret) return json({ error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_not_configured" }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const claimed = await admin.rpc("claim_nexa_accounts_for_cleanup", {
    requested_secret: cleanupSecret,
  });
  if (claimed.error) return json({ error: "unauthorized" }, 401);

  const deleted: string[] = [];
  const failed: Array<{ userId: string; reason: string }> = [];

  for (const row of claimed.data ?? []) {
    const userId = row.user_id as string;
    try {
      const confirmation = await admin.rpc("confirm_nexa_account_cleanup", {
        requested_user_id: userId,
        requested_secret: cleanupSecret,
      });
      if (confirmation.error || confirmation.data !== true) continue;

      while (true) {
        const listed = await admin.storage.from("nexa-media").list(userId, { limit: 100 });
        if (listed.error) throw listed.error;
        if (listed.data.length === 0) break;

        const paths = listed.data.map((item) => `${userId}/${item.name}`);
        const removed = await admin.storage.from("nexa-media").remove(paths);
        if (removed.error) throw removed.error;
      }

      const stillEligible = await admin.rpc("confirm_nexa_account_cleanup", {
        requested_user_id: userId,
        requested_secret: cleanupSecret,
      });
      if (stillEligible.error || stillEligible.data !== true) continue;

      const deletion = await admin.auth.admin.deleteUser(userId, false);
      if (deletion.error) throw deletion.error;
      deleted.push(userId);
    } catch (error) {
      failed.push({
        userId,
        reason: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }

  return json({ processed: claimed.data?.length ?? 0, deleted: deleted.length, failed });
});
