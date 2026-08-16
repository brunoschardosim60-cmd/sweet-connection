import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Site } from "./types";

let fingerprintDaSessao: string | null = null;

function fingerprint() {
  if (fingerprintDaSessao) return fingerprintDaSessao;
  fingerprintDaSessao =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return fingerprintDaSessao;
}

export async function buscarMinisitePublicado(slug: string): Promise<Site | null> {
  const { data, error } = await supabase.rpc("get_published_minisite", {
    requested_slug: slug,
  });
  if (error) throw new Error("Não foi possível carregar este mini-site.");
  return data ? (data as unknown as Site) : null;
}

export async function enviarFormularioPublicado(slug: string, dados: Record<string, string>) {
  const { data, error } = await supabase.rpc("submit_minisite_form", {
    requested_slug: slug,
    submitted_payload: dados as unknown as Json,
    request_origin: typeof window === "undefined" ? "minisite" : window.location.href.slice(0, 120),
    fingerprint: fingerprint(),
  });
  if (error) {
    if (error.message.includes("rate_limit_exceeded")) {
      throw new Error("Aguarde um minuto antes de enviar outra mensagem.");
    }
    throw new Error("Não foi possível enviar sua mensagem. Tente novamente.");
  }
  return data;
}

export async function registrarEventoPublicado(
  slug: string,
  evento: "visita" | "clique" | "whatsapp",
  alvo?: string,
) {
  const { error } = await supabase.rpc("record_minisite_event", {
    requested_slug: slug,
    requested_event: evento,
    session_fingerprint: fingerprint(),
    ...(alvo ? { requested_target: alvo.slice(0, 200) } : {}),
    ...(typeof document !== "undefined" && document.referrer
      ? { request_source: document.referrer.slice(0, 200) }
      : {}),
  });
  if (error) throw new Error(error.message);
}
