/**
 * Envio de eventos de conversão para Meta Pixel, Google Analytics e GTM.
 * Só dispara no navegador e apenas quando o script correspondente foi carregado
 * pelo mini-site publicado (componente `Rastreadores`).
 */
export type EventoMarketing = "add_to_cart" | "iniciar_checkout" | "agendamento_confirmado";

/** Nome equivalente de cada evento nos padrões do Meta Pixel. */
const nomeMeta: Record<EventoMarketing, string> = {
  add_to_cart: "AddToCart",
  iniciar_checkout: "InitiateCheckout",
  agendamento_confirmado: "Schedule",
};

type Janela = Window & {
  dataLayer?: unknown[];
  fbq?: (...args: unknown[]) => void;
  gtag?: (...args: unknown[]) => void;
};

export function eventoMarketing(
  evento: EventoMarketing,
  dados: Record<string, string | number> = {},
) {
  if (typeof window === "undefined") return;
  const w = window as Janela;

  try {
    w.dataLayer = w.dataLayer ?? [];
    w.dataLayer.push({ event: evento, ...dados });
    w.fbq?.("track", nomeMeta[evento], dados);
    w.gtag?.("event", evento, dados);
  } catch {
    /* rastreadores nunca podem quebrar a página do cliente */
  }
}
