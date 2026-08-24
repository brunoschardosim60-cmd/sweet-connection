import type { Modelo } from "./types";

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

const porSegmento: Record<string, RecursoModelo[]> = {
  alimentacao: ["catalogo", "carrinho", "pedidos"],
  comercio: ["catalogo", "carrinho", "whatsapp"],
  beleza: ["agenda", "portfolio", "equipe"],
  saude: ["agenda", "formulario", "equipe"],
  servicos: ["formulario", "portfolio", "whatsapp"],
  profissionais: ["agenda", "formulario", "depoimentos"],
  educacao: ["formulario", "planos", "agenda"],
  turismo: ["reserva", "portfolio", "formulario"],
  imoveis: ["catalogo", "formulario", "mapa"],
  transporte: ["formulario", "whatsapp", "mapa"],
};

const palavras: [RegExp, RecursoModelo][] = [
  [/card[áa]pio|pedido|delivery|combo/i, "pedidos"],
  [/carrinho|checkout/i, "carrinho"],
  [/cat[áa]logo|vitrine|produtos/i, "catalogo"],
  [/reserva|hospedagem|mesa/i, "reserva"],
  [/agenda|agendamento|hor[áa]rio/i, "agenda"],
  [/portf[óo]lio|galeria|antes e depois/i, "portfolio"],
  [/formul[áa]rio|or[çc]amento|contato/i, "formulario"],
  [/equipe|profissionais/i, "equipe"],
  [/plano|assinatura|mensalidade/i, "planos"],
  [/depoimento|avalia[çc]/i, "depoimentos"],
];

/** Até 3 recursos representativos do modelo, inferidos do conteúdo já existente. */
export function recursosDoModelo(modelo: Modelo): RecursoModelo[] {
  const texto = `${modelo.destaque} ${modelo.descricao}`;
  const achados: RecursoModelo[] = [];
  if (modelo.familia === "cardapio") achados.push("catalogo", "carrinho", "pedidos");
  for (const [regex, recurso] of palavras) {
    if (achados.length >= 3) break;
    if (regex.test(texto) && !achados.includes(recurso)) achados.push(recurso);
  }
  for (const recurso of porSegmento[modelo.segmento] ?? ["whatsapp", "formulario", "mapa"]) {
    if (achados.length >= 3) break;
    if (!achados.includes(recurso)) achados.push(recurso);
  }
  return achados.slice(0, 3);
}
