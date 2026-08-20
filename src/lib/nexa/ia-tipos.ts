import type { Aparencia, SegmentoId, TipoFormulario, TipoSecao } from "./types";

/** Estilos visuais que a pessoa pode escolher na criação automática. */
export type EstiloIA = "automatico" | "minimalista" | "moderno" | "elegante" | "vibrante";

/** Preferência de tema informada na criação automática. */
export type TemaIA = "automatico" | "claro" | "escuro";

export interface PreferenciasIA {
  estilo: EstiloIA;
  tema: TemaIA;
}

/** Ajustes de aparência aplicados por estilo (mantêm a identidade do modelo). */
export const ESTILOS_IA: Record<
  Exclude<EstiloIA, "automatico">,
  { rotulo: string; descricao: string; aparencia: Partial<Aparencia> }
> = {
  minimalista: {
    rotulo: "Minimalista",
    descricao: "Poucos elementos, muito respiro",
    aparencia: { fonte: "moderna", botao: "contorno", espacamento: "amplo", raio: 12 },
  },
  moderno: {
    rotulo: "Moderno",
    descricao: "Cards, cantos suaves e contraste",
    aparencia: { fonte: "moderna", botao: "pill", espacamento: "confortavel", raio: 20 },
  },
  elegante: {
    rotulo: "Elegante",
    descricao: "Tipografia serifada e sóbria",
    aparencia: { fonte: "elegante", botao: "solido", espacamento: "amplo", raio: 8 },
  },
  vibrante: {
    rotulo: "Vibrante",
    descricao: "Cores fortes e blocos cheios",
    aparencia: { fonte: "editorial", botao: "solido", espacamento: "compacto", raio: 24 },
  },
};

/** Plano de conteúdo devolvido pela IA para montar o mini-site. */
export interface PlanoIA {
  descricao: string;
  segmento: SegmentoId;
  cores?: { primaria?: string; fundo?: string; texto?: string };
  tema?: "claro" | "escuro";
  secoes?: TipoSecao[];
  servicos?: { nome: string; descricao: string; duracao?: string; preco?: number }[];
  produtos?: { nome: string; descricao: string; preco?: number; categoria?: string }[];
  faq?: { pergunta: string; resposta: string }[];
  depoimentos?: { nome: string; nota?: number; comentario: string }[];
  galeria?: { titulo: string }[];
  formulario?: { tipo?: TipoFormulario; titulo?: string };
  seo?: { titulo?: string; descricao?: string; palavras?: string };
}
