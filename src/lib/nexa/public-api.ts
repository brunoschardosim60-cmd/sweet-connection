import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Site } from "./types";
import type { DadosEntrega, ItemCarrinho, Modalidade } from "./catalogo";

let fingerprintDaSessao: string | null = null;
const CHAVE_FINGERPRINT = "nexa:public-session";

function criarFingerprint() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function fingerprint() {
  if (fingerprintDaSessao) return fingerprintDaSessao;

  if (typeof window !== "undefined") {
    try {
      const existente = window.sessionStorage.getItem(CHAVE_FINGERPRINT);
      if (existente && existente.length <= 500) {
        fingerprintDaSessao = existente;
        return fingerprintDaSessao;
      }
    } catch {
      // Browsers may disable sessionStorage; the in-memory fallback still works.
    }
  }

  fingerprintDaSessao = criarFingerprint();

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(CHAVE_FINGERPRINT, fingerprintDaSessao);
    } catch {
      // Keep the generated value in memory when storage is unavailable.
    }
  }

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

/** A confirmação ao visitante não depende da entrega externa da notificação. */
export function notificarDonoDoMinisite(
  tipo: "formulario" | "agendamento" | "reserva" | "pedido",
  id: string,
) {
  if (!id || typeof window === "undefined") return;
  void fetch("/api/notifications/dispatch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: tipo, id }),
  }).catch(() => {});
}

export async function criarPedidoPublicado(
  slug: string,
  itens: ItemCarrinho[],
  modalidade: Modalidade,
  dados: DadosEntrega,
) {
  const chave = crypto.randomUUID();
  const { data, error } = await supabase.rpc("nexa_criar_pedido_cardapio", {
    requested_slug: slug,
    requested_items: itens as unknown as Json,
    requested_modalidade: modalidade,
    requested_dados: dados as unknown as Json,
    requested_chave: chave,
  });
  if (error) {
    const codigo = error.message;
    if (codigo.includes("minimum_not_reached"))
      throw new Error("O pedido ainda não atingiu o mínimo do estabelecimento.");
    if (codigo.includes("rate_limit_exceeded"))
      throw new Error("Aguarde alguns minutos antes de enviar outro pedido.");
    if (codigo.includes("invalid_address")) throw new Error("Informe o endereço para a entrega.");
    if (codigo.includes("invalid_table"))
      throw new Error("Esta mesa não está disponível. Leia o QR Code da mesa novamente.");
    if (codigo.includes("invalid_contact"))
      throw new Error("Informe seu nome e WhatsApp para confirmar o pedido.");
    throw new Error("Não foi possível confirmar o pedido. Tente novamente.");
  }
  return data as unknown as {
    id: string;
    codigo: number;
    total: number;
    status: string;
    repetido: boolean;
  };
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
