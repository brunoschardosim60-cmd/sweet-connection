import type { SegmentoId } from "./types";

export const segmentos: { id: SegmentoId; nome: string }[] = [
  { id: "alimentacao", nome: "Alimentação" },
  { id: "beleza", nome: "Beleza" },
  { id: "comercio", nome: "Comércio" },
  { id: "servicos", nome: "Serviços" },
  { id: "saude", nome: "Saúde" },
  { id: "eventos", nome: "Eventos" },
  { id: "imoveis", nome: "Imóveis" },
  { id: "transporte", nome: "Transporte" },
  { id: "profissionais", nome: "Profissionais" },
];

export const nomeSegmento = (id: SegmentoId) =>
  segmentos.find((s) => s.id === id)?.nome ?? "Outros";

export const estados = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];
