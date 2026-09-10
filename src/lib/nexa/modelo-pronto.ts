import { criarSite } from "./factory";
import { siteDoModelo } from "./demo-modelos";
import { uid } from "./utils";
import type { Cliente, Site } from "./types";

/** Copia somente conteúdo editorial público, nunca a identidade ou operação da demo. */
export function criarSiteModeloPronto(
  cliente: Cliente,
  modeloId: string,
  slug: string,
  previa = false,
): Site {
  const base = criarSite(cliente, modeloId, slug);
  if (base.modeloId === "personalizado") return base;
  const demo = structuredClone(siteDoModelo(base.modeloId));
  let sequencia = 0;
  const novoId = (tipo: string) =>
    previa ? `previa_${base.modeloId}_${tipo}_${sequencia++}` : uid(tipo);
  const texto = (valor: string) =>
    valor
      .replaceAll(demo.conteudo.nome, cliente.empresa)
      .replaceAll(demo.cliente.cidade, cliente.cidade || "sua cidade");
  return {
    ...base,
    id: previa ? `previa_${base.modeloId}` : base.id,
    aparencia: demo.aparencia,
    conteudo: { ...base.conteudo, descricao: texto(demo.conteudo.descricao) },
    secoes: demo.secoes.map((secao) => ({
      ...secao,
      id: novoId("sec"),
      // Não publicar avaliações, pessoas, promoções ou vídeos fictícios como fatos reais.
      ativa: ["depoimentos", "equipe", "cupom", "promocao", "videos", "livre"].includes(secao.tipo)
        ? false
        : secao.ativa,
    })),
    produtos: demo.produtos.map((produto) => ({
      ...produto,
      id: novoId("prod"),
      nome: texto(produto.nome),
      descricao: texto(produto.descricao),
      ...(produto.personalizacoes
        ? {
            personalizacoes: produto.personalizacoes.map((grupo) => ({
              ...grupo,
              id: novoId("grupo"),
              opcoes: grupo.opcoes.map((opcao) => ({ ...opcao, id: novoId("opcao") })),
            })),
          }
        : {}),
    })),
    servicos: demo.servicos.map(({ profissional: _profissional, ...servico }) => ({
      ...servico,
      id: novoId("serv"),
      nome: texto(servico.nome),
      descricao: texto(servico.descricao),
    })),
    galeria: demo.galeria.map((foto) => ({
      ...foto,
      id: novoId("foto"),
      titulo: texto(foto.titulo),
    })),
    faq: demo.faq.map((item) => ({
      ...item,
      id: novoId("faq"),
      pergunta: texto(item.pergunta),
      resposta: texto(item.resposta),
    })),
    formulario: {
      ...demo.formulario,
      campos: demo.formulario.campos.map((campo) => ({ ...campo, id: novoId("campo") })),
    },
    seo: { ...base.seo, descricao: texto(demo.conteudo.descricao) },
  };
}
