import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { pedirPermissaoDosAvisos } from "@/lib/nexa/push-permission";

async function salvar(
  site: string,
  action: "enable" | "disable" | "status",
  subscription: PushSubscription,
) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Entre novamente para configurar os avisos.");
  const r = await fetch("/api/notifications/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({ site, action, subscription: subscription.toJSON() }),
  });
  const result = await r.json();
  if (!r.ok) throw new Error(result.error ?? "Não foi possível configurar os avisos.");
  return result.active === true;
}
function suportado() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}
export function AvisosPush({ site, usuario }: { site: string; usuario: string }) {
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let mounted = true;
    void fetch("/api/notifications/push")
      .then(async (r) => (r.ok ? await r.json() : null))
      .then((config) => {
        if (mounted) setPublicKey(typeof config?.publicKey === "string" ? config.publicKey : null);
      })
      .catch(() => {
        if (mounted) setPublicKey(null);
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    let mounted = true;
    if (suportado())
      void (async () => {
        const reg = await navigator.serviceWorker.getRegistration("/");
        const sub = await reg?.pushManager.getSubscription();
        const enabled = sub ? await salvar(site, "status", sub) : false;
        if (mounted) setActive(enabled && Notification.permission === "granted");
      })().catch(() => {
        if (mounted) setActive(false);
      });
    return () => {
      mounted = false;
    };
  }, [site, usuario]);
  async function alternar() {
    setErro(null);
    if (!suportado()) {
      toast.info(
        "Este navegador não oferece Web Push. No iPhone, use o aplicativo adicionado à Tela de Início.",
      );
      return;
    }
    setBusy(true);
    try {
      if (active) {
        const reg = await navigator.serviceWorker.getRegistration("/");
        const sub = await reg?.pushManager.getSubscription();
        if (sub) await salvar(site, "disable", sub);
        setActive(false);
        toast.success("Avisos desta loja desativados neste dispositivo.");
        return;
      }
      if (!publicKey) throw new Error("Web Push ainda não foi configurado pelo administrador.");
      // Keep the permission request directly in the user gesture (not after a fetch).
      await pedirPermissaoDosAvisos(Notification);
      const reg = await navigator.serviceWorker.register("/nexa-push-sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      const ready = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("O navegador demorou para ativar os avisos. Tente novamente.")),
            12000,
          ),
        ),
      ]);
      let sub = await ready.pushManager.getSubscription();
      if (!sub) {
        const binary = atob(publicKey.replace(/-/g, "+").replace(/_/g, "/"));
        const key = Uint8Array.from(binary, (c) => c.charCodeAt(0));
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      }
      const enabled = await salvar(site, "enable", sub);
      if (!enabled) throw new Error("A loja não confirmou a ativação dos avisos. Tente novamente.");
      setActive(true);
      toast.success("Avisos ativados para esta loja e dispositivo, mesmo com a página fechada.");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível ativar os avisos.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-sm">
      <button
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-3 text-sm font-semibold disabled:opacity-50"
        disabled={busy || publicKey === undefined}
        aria-pressed={active}
        onClick={() => void alternar()}
      >
        <Bell size={16} />
        {busy
          ? "Configurando…"
          : active
            ? "Desativar avisos desta loja"
            : "Ativar avisos desta loja"}
      </button>
      {erro && (
        <p role="alert" className="mt-2 rounded-lg border border-border bg-muted p-3 text-sm">
          {erro}
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        Avisos neste dispositivo com a página fechada. Dependem das permissões do navegador e do
        sistema. Desative antes de sair de um dispositivo compartilhado.
      </p>
    </div>
  );
}
