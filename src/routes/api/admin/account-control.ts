import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Acao = "suspender" | "reativar";

const json = (body: unknown, status = 200) => Response.json(body, { status });

async function adminAutenticado(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: papel, error: erroPapel } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .maybeSingle();
  return erroPapel || !papel ? null : data.user;
}

export const Route = createFileRoute("/api/admin/account-control")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const admin = await adminAutenticado(request);
          if (!admin) return json({ error: "Administrador não autenticado." }, 401);
          const body = (await request.json()) as { userId?: unknown; action?: unknown };
          const userId = typeof body.userId === "string" ? body.userId : "";
          const action = body.action as Acao;
          if (!/^[0-9a-f-]{36}$/i.test(userId) || !["suspender", "reativar"].includes(action)) {
            return json({ error: "Solicitação inválida." }, 400);
          }
          if (userId === admin.id && action === "suspender") {
            return json({ error: "Você não pode suspender sua própria conta." }, 400);
          }
          const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            // 100 years is used as an operational indefinite ban; reactivation sends "none".
            ban_duration: action === "suspender" ? "876000h" : "none",
          });
          if (error) throw error;
          return json({ ok: true });
        } catch (error) {
          console.error("[Admin account control]", error);
          return json({ error: "Não foi possível atualizar o bloqueio de login." }, 503);
        }
      },
    },
  },
});
