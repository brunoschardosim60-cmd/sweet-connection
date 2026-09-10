import { z } from "zod";
import type { EscopoAjusteIA, PlanoIA } from "./ia-tipos";

const texto = z.string().max(2000);
const cor = z.string().regex(/^#[0-9a-f]{6}$/i);
const cores = z.object({ primaria: cor, fundo: cor, texto: cor });
const layout = z.enum([
  "editorial",
  "cards",
  "catalogo",
  "imersivo",
  "minimalista",
  "urbano",
  "corporativo",
  "colorido",
]);
const fonte = z.enum(["moderna", "elegante", "editorial"]);
const item = z.object({
  nome: texto.min(1),
  descricao: texto.default(""),
  preco: z.number().finite().min(0).max(10000000).optional(),
  imagemIndice: z.number().int().min(0).max(19).optional(),
});
export const esquemaPlanoIA = z.object({
  sessaoAjustes: z.string().max(2000).optional(),
  descricao: texto,
  segmento: z.enum([
    "alimentacao",
    "beleza",
    "comercio",
    "servicos",
    "saude",
    "eventos",
    "imoveis",
    "transporte",
    "profissionais",
  ]),
  cores: cores.partial().optional(),
  tema: z.enum(["claro", "escuro"]).optional(),
  layout: layout.optional(),
  fonte: fonte.optional(),
  cta: z.string().max(60).optional(),
  direcoes: z
    .array(
      z.object({ nome: z.string().max(80), conceito: z.string().max(300), layout, fonte, cores }),
    )
    .max(3)
    .optional(),
  recomendacoes: z.array(z.string().max(300)).max(5).optional(),
  secoes: z
    .array(
      z.enum([
        "apresentacao",
        "links",
        "produtos",
        "servicos",
        "cardapio",
        "galeria",
        "equipe",
        "videos",
        "localizacao",
        "horarios",
        "faq",
        "formulario",
        "rodape",
      ]),
    )
    .max(20)
    .optional(),
  produtos: z
    .array(item.extend({ categoria: texto.optional() }))
    .max(20)
    .optional(),
  servicos: z
    .array(item.extend({ duracao: texto.optional() }))
    .max(20)
    .optional(),
  faq: z
    .array(z.object({ pergunta: texto, resposta: texto }))
    .max(8)
    .optional(),
  galeria: z
    .array(z.object({ titulo: texto }))
    .max(20)
    .optional(),
  formulario: z
    .object({
      tipo: z.enum(["orcamento", "contato", "reserva", "agendamento", "cotacao"]).optional(),
      titulo: texto.optional(),
    })
    .optional(),
  seo: z
    .object({ titulo: texto.optional(), descricao: texto.optional(), palavras: texto.optional() })
    .optional(),
});

export function validarPlanoIA(valor: unknown): PlanoIA {
  return esquemaPlanoIA.parse(valor) as PlanoIA;
}

/** O servidor preserva os campos fora do escopo mesmo se o provedor tentar mudá-los. */
export function aplicarAjusteIA(
  anterior: PlanoIA,
  gerado: PlanoIA,
  escopo: EscopoAjusteIA,
): PlanoIA {
  if (escopo === "completo") return gerado;
  const campos =
    escopo === "visual"
      ? (["cores", "tema", "layout", "fonte", "direcoes"] as const)
      : escopo === "textos"
        ? (["descricao", "cta", "faq", "seo"] as const)
        : (["produtos", "servicos"] as const);
  const patch = Object.fromEntries(
    campos.filter((campo) => gerado[campo] !== undefined).map((campo) => [campo, gerado[campo]]),
  );
  return { ...anterior, ...patch };
}
