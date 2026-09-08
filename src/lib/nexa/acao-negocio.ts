import type { Site } from "./types";

/** Usa as seções habilitadas, não apenas o nome do segmento. */
export function acaoNegocio(site: Site) {
  const tem = (tipo: string) => site.secoes.some((s) => s.ativa && s.tipo === tipo);
  if (
    tem("agenda") &&
    site.agenda?.ativa !== false &&
    site.conteudo.horarios.some((h) => !h.fechado && h.abre && h.fecha)
  )
    return { rotulo: "Escolher horário", secao: "agenda", tipo: "interno" as const };
  if (tem("formulario")) {
    const rotulo =
      site.formulario.tipo === "reserva"
        ? "Consultar disponibilidade"
        : site.formulario.tipo === "orcamento" || site.formulario.tipo === "cotacao"
          ? "Pedir orçamento"
          : site.formulario.tipo === "agendamento"
            ? "Solicitar agendamento"
            : "Entrar em contato";
    return { rotulo, secao: "formulario", tipo: "interno" as const };
  }
  return { rotulo: "Conversar no WhatsApp", secao: "", tipo: "whatsapp" as const };
}
