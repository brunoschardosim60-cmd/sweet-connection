import type { SegmentoId, TipoFormulario, TipoSecao } from "./types";

/** Plano de conteúdo devolvido pela IA para montar o mini-site. */
export interface PlanoIA {
  descricao: string;
  segmento: SegmentoId;
  modeloId: string;
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
