import { uid } from "./utils";
import { ESTILOS_IA, type PlanoIA, type PreferenciasIA } from "./ia-tipos";
import type { ItemVideo, MembroEquipe, Site, TipoSecao } from "./types";
import { camposFormulario } from "./factory";

const hex = (valor?: string) =>
  valor && /^#[0-9a-fA-F]{6}$/.test(valor.trim()) ? valor.trim() : undefined;

const limitar = <T>(lista: T[] | undefined, max: number): T[] => (lista ?? []).slice(0, max);

/** Arquivos classificados no assistente de criação; não são conteúdo inventado pela IA. */
export interface MidiasDaCriacaoIA {
  associacaoExplicita?: boolean;
  capa?: string;
  produtos?: string[];
  galeria?: string[];
  equipe?: MembroEquipe[];
  videos?: ItemVideo[];
}

/**
 * Aplica o plano gerado pela IA sobre um site base criado pelo factory.
 * Função pura: não toca em rede, storage nem Supabase.
 */
export function aplicarPlanoIA(
  base: Site,
  plano: PlanoIA,
  imagens: string[] = [],
  preferencias?: PreferenciasIA,
  logo?: string,
  midias?: MidiasDaCriacaoIA,
): Site {
  const estilo =
    preferencias && preferencias.estilo !== "automatico"
      ? ESTILOS_IA[preferencias.estilo]
      : undefined;
  const temaEscolhido =
    preferencias && preferencias.tema !== "automatico" ? preferencias.tema : undefined;
  const fotos = imagens.filter(Boolean);
  const [capaLegada, ...restantes] = fotos;
  const capa = midias?.capa ?? capaLegada;
  const fotosProdutos = midias?.produtos ?? restantes;

  const fotoItem = (indice: number | undefined, ordem: number) => {
    const posicao = indice ?? (midias?.associacaoExplicita ? -1 : ordem);
    return Number.isInteger(posicao) && posicao >= 0 ? fotosProdutos[posicao] : undefined;
  };
  const produtos = limitar(plano.produtos, 20).map((p, i) => ({
    id: uid("prod"),
    nome: p.nome,
    descricao: p.descricao ?? "",
    preco: typeof p.preco === "number" ? p.preco : 0,
    categoria: p.categoria ?? "Geral",
    variacoes: [] as string[],
    ...(fotoItem(p.imagemIndice, i) ? { imagem: fotoItem(p.imagemIndice, i)! } : {}),
    disponivel: typeof p.preco === "number",
    destaque: i === 0,
  }));

  const servicos = limitar(plano.servicos, 20).map((s, i) => ({
    id: uid("serv"),
    nome: s.nome,
    descricao: s.descricao ?? "",
    duracao: s.duracao ?? "",
    preco: typeof s.preco === "number" ? s.preco : 0,
    ...(fotoItem(s.imagemIndice, i) ? { imagem: fotoItem(s.imagemIndice, i)! } : {}),
  }));

  const usadasEmItens = Math.max(produtos.length, servicos.length);
  const sobrando = midias?.associacaoExplicita ? [] : fotosProdutos.slice(usadasEmItens);
  const fotosGaleria = midias?.galeria?.length ? midias.galeria : sobrando;
  const galeria = fotosGaleria.map((url, i) => ({
    id: uid("img"),
    url,
    titulo: plano.galeria?.[i]?.titulo ?? base.conteudo.nome,
  }));

  const depoimentos = limitar(plano.depoimentos, 6).map((d, i) => ({
    id: uid("dep"),
    nome: d.nome,
    nota: Math.min(5, Math.max(1, Math.round(d.nota ?? 5))),
    comentario: d.comentario,
    data: new Date().toISOString().slice(0, 10),
    destaque: i === 0,
  }));

  const faq = limitar(plano.faq, 8).map((f) => ({
    id: uid("faq"),
    pergunta: f.pergunta,
    resposta: f.resposta,
  }));

  const ativas = new Set<TipoSecao>(plano.secoes ?? []);
  if (produtos.length) ativas.add("produtos");
  if (plano.segmento === "alimentacao" && produtos.length) ativas.add("cardapio");
  if (servicos.length) ativas.add("servicos");
  if (galeria.length) ativas.add("galeria");
  if (depoimentos.length) ativas.add("depoimentos");
  if (faq.length) ativas.add("faq");
  if (midias?.equipe?.length) ativas.add("equipe");
  if (midias?.videos?.length) ativas.add("videos");
  ativas.add("apresentacao");
  ativas.add("links");
  if (!plano.secoes || plano.secoes.includes("formulario")) ativas.add("formulario");
  ativas.add("rodape");

  const ordem = plano.secoes ?? base.secoes.map((secao) => secao.tipo);
  const secoes = [...base.secoes]
    .sort((a, b) => {
      const pos = (tipo: TipoSecao) => (ordem.includes(tipo) ? ordem.indexOf(tipo) : 99);
      return pos(a.tipo) - pos(b.tipo);
    })
    .map((secao) => ({
      ...secao,
      ativa: ativas.has(secao.tipo),
    }));

  return {
    ...base,
    links: base.links.map((link) =>
      link.tipo === "whatsapp" && plano.cta ? { ...link, titulo: plano.cta } : link,
    ),
    conteudo: {
      ...base.conteudo,
      descricao: plano.descricao || base.conteudo.descricao,
      ...(logo ? { logo } : {}),
      ...(capa ? { capa } : {}),
    },
    aparencia: {
      ...base.aparencia,
      ...(plano.layout ? { layout: plano.layout } : {}),
      corPrimaria: hex(plano.cores?.primaria) ?? base.aparencia.corPrimaria,
      corFundo: hex(plano.cores?.fundo) ?? base.aparencia.corFundo,
      corTexto: hex(plano.cores?.texto) ?? base.aparencia.corTexto,
      tema: temaEscolhido ?? plano.tema ?? base.aparencia.tema,
      capaTipo: capa ? "imagem" : base.aparencia.capaTipo,
      ...(estilo?.aparencia ?? {}),
      ...(plano.fonte ? { fonte: plano.fonte } : {}),
    },
    secoes,
    produtos: produtos.length ? produtos : base.produtos,
    servicos: servicos.length ? servicos : base.servicos,
    galeria: galeria.length ? galeria : base.galeria,
    equipe: midias?.equipe?.length ? midias.equipe : base.equipe,
    ...(midias?.videos?.length
      ? { videos: midias.videos }
      : base.videos
        ? { videos: base.videos }
        : {}),
    depoimentos,
    faq,
    formulario: {
      ...base.formulario,
      tipo: plano.formulario?.tipo ?? base.formulario.tipo,
      titulo: plano.formulario?.titulo ?? base.formulario.titulo,
      ...(plano.formulario?.tipo && plano.formulario.tipo !== base.formulario.tipo
        ? { campos: camposFormulario(plano.formulario.tipo) }
        : {}),
    },
    seo: {
      ...base.seo,
      titulo: plano.seo?.titulo ?? base.seo.titulo,
      descricao: plano.seo?.descricao ?? base.seo.descricao,
      palavras: plano.seo?.palavras ?? base.seo.palavras,
      ...(capa ? { imagem: capa } : {}),
    },
  };
}
