import type { SegmentoId } from "./types";

export interface DadosImportados {
  texto: string;
  empresa?: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
  endereco?: string;
  segmento?: SegmentoId;
}

const segmentos: [RegExp, SegmentoId][] = [
  [/barbear|sal[aã]o|beleza|est[eé]tica/i, "beleza"],
  [/restaurante|pizzaria|hamburguer|caf[eé]|bar\b|doceria|aliment/i, "alimentacao"],
  [/cl[ií]nica|dent|odont|sa[uú]de/i, "saude"],
  [/im[oó]vel|imobili/i, "imoveis"],
  [/transporte|frete|carga/i, "transporte"],
  [/advoc|jur[ií]d/i, "profissionais"],
  [/evento|buffet|festa/i, "eventos"],
];

/** Extrai apenas dados que aparecem explicitamente em texto copiado pelo usuário. */
export function importarDadosPublicos(texto: string): DadosImportados {
  const linhas = texto
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);
  const telefone = texto.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}/)?.[0];
  const endereco = linhas.find((linha) => /\b[A-Z]{2}\b\s*,?\s*\d{5}-?\d{3}/.test(linha));
  const cidadeEstado = endereco?.match(/-\s*([^,-]+)\s*-\s*([A-Z]{2})\s*,/);
  const empresa = linhas.find((linha) => linha.length > 2 && !/^\d[\d,.]*$/.test(linha));
  const segmento = segmentos.find(([padrao]) => padrao.test(texto))?.[1];
  return {
    texto: texto.trim(),
    ...(empresa ? { empresa } : {}),
    ...(telefone ? { telefone } : {}),
    ...(endereco ? { endereco } : {}),
    ...(cidadeEstado ? { cidade: cidadeEstado[1]!.trim(), estado: cidadeEstado[2]! } : {}),
    ...(segmento ? { segmento } : {}),
  };
}
