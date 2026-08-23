import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Site } from "./types";
import type { DadosEntrega, ItemCarrinho, Modalidade } from "./catalogo";

let fingerprintDaSessao: string | null = null;
const CHAVE_FINGERPRINT = "nexa:public-session";
const chavePedidos = (slug: string) => `nexa:public-menu-orders:${slug}`;

export interface PedidoPublico {
  id: string;
  codigo: number;
  status: string;
  modalidade: "entrega" | "retirada" | "mesa";
  total: number;
  createdAt: string;
  updatedAt: string;
  itens: { nome: string; quantidade: number; preco?: number }[];
  trackingToken: string;
}

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
    // PostgREST pode devolver a exceção da RPC em message, details ou hint,
    // conforme a versão do gateway. Todos precisam ser considerados.
    const codigo = [error.code, error.message, error.details, error.hint].filter(Boolean).join(" ");
    if (codigo.includes("minimum_not_reached"))
      throw new Error("O pedido ainda não atingiu o mínimo do estabelecimento.");
    if (codigo.includes("rate_limit_exceeded"))
      throw new Error("Aguarde alguns minutos antes de enviar outro pedido.");
    if (codigo.includes("invalid_address")) throw new Error("Informe o endereço para a entrega.");
    if (codigo.includes("invalid_items") || codigo.includes("invalid_product"))
      throw new Error("Revise os itens do pedido e tente novamente.");
    if (codigo.includes("invalid_quantity"))
      throw new Error("A quantidade de um dos itens não é permitida.");
    if (codigo.includes("invalid_modality"))
      throw new Error("Escolha uma modalidade de entrega válida.");
    if (codigo.includes("invalid_payment"))
      throw new Error("Escolha uma forma de pagamento aceita pelo estabelecimento.");
    if (codigo.includes("minisite_not_found"))
      throw new Error("Este cardápio não está publicado ou não está disponível no momento.");
    if (codigo.includes("invalid_table"))
      throw new Error("Esta mesa não está disponível. Leia o QR Code da mesa novamente.");
    if (codigo.includes("invalid_contact"))
      throw new Error("Informe seu nome e WhatsApp para confirmar o pedido.");
    if (codigo.includes("42501") || /permission|policy|not allowed/i.test(codigo))
      throw new Error(
        "O cardápio não está autorizado a receber pedidos agora. Avise o estabelecimento.",
      );
    if (/PGRST202|function.*not found/i.test(codigo))
      throw new Error("O cardápio está sendo atualizado. Recarregue a página e tente novamente.");
    console.error("[Nexa pedido] Falha ao confirmar", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error("Não foi possível confirmar o pedido. Tente novamente.");
  }
  return data as unknown as {
    id: string;
    codigo: number;
    total: number;
    status: string;
    repetido: boolean;
    trackingToken: string;
  };
}

/** Guarda somente o token aleatório dos pedidos deste navegador, nunca dados pessoais. */
export function guardarAcompanhamentoPedido(slug: string, token: string) {
  if (typeof window === "undefined" || !/^[\da-f-]{36}$/i.test(token)) return;
  try {
    const anterior = JSON.parse(window.localStorage.getItem(chavePedidos(slug)) ?? "[]");
    const tokens = Array.isArray(anterior)
      ? anterior.filter((v): v is string => typeof v === "string")
      : [];
    window.localStorage.setItem(
      chavePedidos(slug),
      JSON.stringify([token, ...tokens.filter((v) => v !== token)].slice(0, 20)),
    );
  } catch {
    // Sem armazenamento local, o pedido ainda é confirmado, mas não fica disponível após recarregar.
  }
}

export async function buscarMeusPedidosPublicos(slug: string): Promise<PedidoPublico[]> {
  if (typeof window === "undefined") return [];
  let tokens: string[] = [];
  try {
    const salvo = JSON.parse(window.localStorage.getItem(chavePedidos(slug)) ?? "[]");
    tokens = Array.isArray(salvo)
      ? salvo.filter((v): v is string => /^[\da-f-]{36}$/i.test(v))
      : [];
  } catch {
    return [];
  }
  if (tokens.length === 0) return [];
  const { data, error } = await supabase.rpc("nexa_meus_pedidos_cardapio", {
    requested_slug: slug,
    requested_tokens: tokens,
  });
  if (error) throw new Error("Não foi possível atualizar seus pedidos agora.");
  return Array.isArray(data) ? (data as unknown as PedidoPublico[]) : [];
}

export async function buscarEstoquePublicado(slug: string): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc("nexa_estoque_publico_cardapio", {
    requested_slug: slug,
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return {};
  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).flatMap(([id, quantidade]) =>
      typeof quantidade === "number" && Number.isFinite(quantidade) ? [[id, quantidade]] : [],
    ),
  );
}

/** Avaliação só é aceita após a conclusão e pelo navegador que fez o pedido. */
export async function avaliarPedidoPublicado(
  slug: string,
  token: string,
  nota: number,
  comentario: string,
) {
  const { error } = await supabase.rpc("nexa_avaliar_pedido_cardapio", {
    requested_slug: slug,
    requested_token: token,
    requested_nota: nota,
    requested_comentario: comentario,
  });
  if (error) {
    if (error.message.includes("order_not_eligible"))
      throw new Error("A avaliação fica disponível quando o pedido for concluído.");
    throw new Error("Não foi possível enviar a avaliação. Tente novamente.");
  }
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
