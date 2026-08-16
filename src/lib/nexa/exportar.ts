import { z } from "zod";
import type { Site } from "./types";
import { slugify, uid } from "./utils";

export const VERSAO_ARQUIVO = 1;

export interface ArquivoNexa {
  formato: "nexa-minisite";
  versao: number;
  exportadoEm: string;
  site: Site;
}

const texto = (max = 4000) => z.string().max(max);
const id = texto(200);
const url = texto(4000);

const schemaSiteImportado = z
  .object({
    id,
    slug: texto(80),
    status: z.enum(["publicado", "rascunho", "pausado"]),
    modeloId: id,
    criadoEm: texto(80),
    atualizadoEm: texto(80),
    cliente: z
      .object({
        empresa: texto(240),
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
        responsavel: texto(240),
        telefone: texto(80),
        email: texto(320),
        cidade: texto(240),
        estado: texto(80),
      })
      .passthrough(),
    conteudo: z
      .object({
        nome: texto(240),
        descricao: texto(4000),
        logo: url.optional(),
        capa: url.optional(),
        telefone: texto(80),
        whatsapp: texto(80),
        email: texto(320),
        instagram: texto(240),
        endereco: texto(1000),
        horarios: z
          .array(
            z
              .object({ dia: texto(40), abre: texto(20), fecha: texto(20), fechado: z.boolean() })
              .passthrough(),
          )
          .max(31),
      })
      .passthrough(),
    aparencia: z
      .object({
        corPrimaria: texto(100),
        corFundo: texto(100),
        corTexto: texto(100),
        fonte: z.enum(["moderna", "elegante", "tecnica", "editorial"]),
        raio: z.number().finite().min(0).max(100),
        botao: z.enum(["solido", "contorno", "suave", "pill"]),
        tema: z.enum(["claro", "escuro"]),
        animacoes: z.boolean(),
        espacamento: z.enum(["compacto", "confortavel", "amplo"]),
        layout: z.enum([
          "editorial",
          "cards",
          "catalogo",
          "imersivo",
          "minimalista",
          "urbano",
          "corporativo",
          "colorido",
        ]),
        capaTipo: z.enum(["imagem", "cor"]),
      })
      .passthrough(),
    secoes: z
      .array(
        z
          .object({
            id,
            tipo: z.enum([
              "apresentacao",
              "links",
              "produtos",
              "servicos",
              "cardapio",
              "galeria",
              "videos",
              "depoimentos",
              "equipe",
              "promocao",
              "cupom",
              "localizacao",
              "horarios",
              "faq",
              "formulario",
              "rodape",
            ]),
            titulo: texto(240),
            ativa: z.boolean(),
          })
          .passthrough(),
      )
      .max(100),
    links: z
      .array(
        z
          .object({
            id,
            tipo: z.enum([
              "whatsapp",
              "instagram",
              "facebook",
              "tiktok",
              "youtube",
              "site",
              "telefone",
              "email",
              "localizacao",
              "personalizado",
            ]),
            titulo: texto(240),
            valor: texto(),
            mensagem: texto(1000).optional(),
            cor: texto(100).optional(),
            ativo: z.boolean(),
          })
          .passthrough(),
      )
      .max(500),
    produtos: z
      .array(
        z
          .object({
            id,
            nome: texto(240),
            descricao: texto(),
            preco: z.number().finite(),
            precoPromocional: z.number().finite().optional(),
            categoria: texto(240),
            variacoes: z.array(texto(240)).max(100),
            imagem: url.optional(),
            disponivel: z.boolean(),
            destaque: z.boolean(),
          })
          .passthrough(),
      )
      .max(1000),
    servicos: z
      .array(
        z
          .object({
            id,
            nome: texto(240),
            descricao: texto(),
            duracao: texto(120),
            preco: z.number().finite(),
            profissional: texto(240).optional(),
            imagem: url.optional(),
          })
          .passthrough(),
      )
      .max(1000),
    galeria: z
      .array(
        z
          .object({ id, url, titulo: texto(240), tipo: z.enum(["imagem", "video"]).optional() })
          .passthrough(),
      )
      .max(1000),
    videos: z
      .array(
        z.object({ id, url, titulo: texto(240), descricao: texto(1000).optional() }).passthrough(),
      )
      .max(500)
      .optional(),
    depoimentos: z
      .array(
        z
          .object({
            id,
            nome: texto(240),
            foto: url.optional(),
            nota: z.number().finite().min(0).max(5),
            comentario: texto(),
            data: texto(80),
            destaque: z.boolean(),
          })
          .passthrough(),
      )
      .max(1000),
    equipe: z
      .array(
        z.object({ id, nome: texto(240), funcao: texto(240), foto: url.optional() }).passthrough(),
      )
      .max(500),
    cupons: z
      .array(
        z
          .object({
            id,
            titulo: texto(240),
            descricao: texto(),
            codigo: texto(120),
            validade: texto(80),
            ativo: z.boolean(),
          })
          .passthrough(),
      )
      .max(500),
    faq: z
      .array(z.object({ id, pergunta: texto(1000), resposta: texto(4000) }).passthrough())
      .max(500),
    formulario: z
      .object({
        tipo: z.enum(["orcamento", "contato", "reserva", "agendamento", "cotacao"]),
        titulo: texto(240),
        campos: z
          .array(
            z
              .object({
                id,
                rotulo: texto(240),
                tipo: z.enum(["texto", "email", "telefone", "data", "textarea"]),
                obrigatorio: z.boolean(),
              })
              .passthrough(),
          )
          .max(100),
      })
      .passthrough(),
    seo: z
      .object({
        titulo: texto(240),
        descricao: texto(1000),
        imagem: url.optional(),
        palavras: texto(1000),
      })
      .passthrough(),
    integracoes: z
      .object({
        googleAnalytics: texto(240),
        metaPixel: texto(240),
        dominio: texto(500),
        googleMaps: texto(2000),
        whatsappApi: texto(1000),
      })
      .passthrough(),
    metricas: z
      .object({
        visitas: z.number().finite().nonnegative(),
        cliquesWhatsapp: z.number().finite().nonnegative(),
        solicitacoes: z.number().finite().nonnegative(),
        serie: z
          .array(
            z
              .object({
                dia: texto(80),
                visitas: z.number().finite().nonnegative(),
                cliques: z.number().finite().nonnegative(),
              })
              .passthrough(),
          )
          .max(5000),
        origens: z
          .array(
            z.object({ nome: texto(240), valor: z.number().finite().nonnegative() }).passthrough(),
          )
          .max(500),
        horarios: z
          .array(
            z.object({ hora: texto(80), valor: z.number().finite().nonnegative() }).passthrough(),
          )
          .max(500),
      })
      .passthrough(),
  })
  .passthrough();

export function montarArquivo(site: Site): ArquivoNexa {
  return {
    formato: "nexa-minisite",
    versao: VERSAO_ARQUIVO,
    exportadoEm: new Date().toISOString(),
    site: structuredClone(site),
  };
}

export function baixarJson(site: Site) {
  const conteudo = JSON.stringify(montarArquivo(site), null, 2);
  const blob = new Blob([conteudo], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nexa-${site.slug || slugify(site.conteudo.nome) || "mini-site"}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function lerArquivo(texto: string): Site {
  if (texto.length > 2_000_000) throw new Error("Arquivo inválido: o limite é 2 MB.");

  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    throw new Error("Arquivo inválido: o JSON não pôde ser lido.");
  }

  if (!bruto || typeof bruto !== "object") {
    throw new Error("Arquivo inválido: não parece uma configuração de mini-site Nexa.");
  }

  const envelope = bruto as Partial<ArquivoNexa>;
  if ("formato" in envelope && envelope.formato !== "nexa-minisite") {
    throw new Error("Arquivo inválido: formato de exportação desconhecido.");
  }
  if (envelope.formato === "nexa-minisite" && envelope.versao !== VERSAO_ARQUIVO) {
    throw new Error("Arquivo incompatível: versão de exportação não suportada.");
  }

  const site = envelope.formato === "nexa-minisite" ? envelope.site : bruto;
  const validado = schemaSiteImportado.safeParse(site);
  if (!validado.success) {
    throw new Error("Arquivo inválido: dados obrigatórios ausentes ou incompatíveis.");
  }
  return validado.data as Site;
}

/** Aplica um JSON importado sobre um site existente, preservando id/slug/cliente. */
export function mesclarImportacao(atual: Site, importado: Site): Site {
  return {
    ...importado,
    id: atual.id,
    slug: atual.slug,
    status: atual.status,
    criadoEm: atual.criadoEm,
    atualizadoEm: new Date().toISOString(),
    cliente: atual.cliente,
    metricas: atual.metricas,
  };
}

/** Cria uma cópia independente do site importado (novo cliente). */
export function duplicarImportacao(importado: Site, slugExistentes: string[]): Site {
  let base = slugify(importado.slug || importado.conteudo.nome).slice(0, 48);
  if (base.length < 3) base = slugify(importado.conteudo.nome).slice(0, 48);
  if (base.length < 3) base = "mini-site";
  base = base.replace(/-+$/, "") || "mini-site";

  const existentes = new Set(slugExistentes.map((slug) => slug.toLowerCase()));
  let slug = base;
  let n = 2;
  while (existentes.has(slug)) {
    const sufixo = `-${n++}`;
    slug = `${base.slice(0, 48 - sufixo.length).replace(/-+$/, "")}${sufixo}`;
  }
  return {
    ...structuredClone(importado),
    id: uid("site"),
    slug,
    status: "rascunho",
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };
}
