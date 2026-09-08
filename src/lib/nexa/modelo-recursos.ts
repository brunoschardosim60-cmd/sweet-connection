import type { Modelo, TipoSecao } from "./types";
import { presetsModelo } from "./modelo-presets";

/** Identificadores de recursos exibidos como chips nos cards de modelo. */
export type RecursoModelo =
  | "agenda"
  | "formulario"
  | "portfolio"
  | "pedidos"
  | "carrinho"
  | "reserva"
  | "catalogo"
  | "whatsapp"
  | "equipe"
  | "mapa"
  | "depoimentos"
  | "planos";

export const rotuloRecurso: Record<RecursoModelo, string> = {
  agenda: "Agenda",
  formulario: "Formulário",
  portfolio: "Portfólio",
  pedidos: "Pedidos",
  carrinho: "Carrinho",
  reserva: "Reserva",
  catalogo: "Catálogo",
  whatsapp: "WhatsApp",
  equipe: "Equipe",
  mapa: "Como chegar",
  depoimentos: "Depoimentos",
  planos: "Planos",
};

/** Recursos derivados do mesmo preset usado na criação e na demonstração. */
export function recursosDoModelo(modelo: Modelo): RecursoModelo[] {
  if (modelo.familia === "cardapio") return ["catalogo", "carrinho", "pedidos"];
  const preset = presetsModelo[modelo.id];
  if (!preset) return ["whatsapp"];
  const tem = (secao: TipoSecao) => preset.secoes.includes(secao);
  const recursos: RecursoModelo[] = [];
  if (tem("agenda")) recursos.push("agenda");
  if (tem("formulario") && preset.formulario === "reserva") recursos.push("reserva");
  if (tem("produtos") || tem("cardapio")) recursos.push("catalogo");
  if (tem("galeria")) recursos.push("portfolio");
  if (tem("formulario")) recursos.push("formulario");
  if (tem("equipe")) recursos.push("equipe");
  if (tem("depoimentos")) recursos.push("depoimentos");
  if (tem("localizacao")) recursos.push("mapa");
  if (tem("links")) recursos.push("whatsapp");
  return recursos.slice(0, 3);
}
