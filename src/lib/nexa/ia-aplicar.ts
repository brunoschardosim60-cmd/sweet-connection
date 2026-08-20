import { uid } from "./utils";
import { ESTILOS_IA, type PlanoIA, type PreferenciasIA } from "./ia-tipos";
import type { Site, TipoSecao } from "./types";

const hex = (valor?: string) =>
  valor && /^#[0-9a-fA-F]{6}$/.test(valor.trim()) ? valor.trim() : undefined;

const limitar = <T>(lista: T[] | undefined, max: number): T[] => (lista ?? []).slice(0, max);

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
): Site {
  const estilo =
    preferencias && preferencias.estilo !== "automatico"
      ? ESTILOS_IA[preferencias.estilo]
      : undefined;
  const temaEscolhido =
    preferencias && preferencias.tema !== "automatico" ? preferencias.tema : undefined;
  const fotos = imagens.filter(Boolean);
  const [capa, ...restantes] = fotos;

  const produtos = limitar(plano.produtos, 8).map((p, i) => ({
    id: uid("prod"),
    nome: p.nome,
    descricao: p.descricao ?? "",
    preco: typeof p.preco === "number" ? p.preco : 0,
    categoria: p.categoria ?? "Geral",
    variacoes: [] as string[],
    ...(restantes[i] ? { imagem: restantes[i] } : {}),
    disponivel: true,
    destaque: i === 0,
  }));

  const servicos = limitar(plano.servicos, 8).map((s, i) => ({
    id: uid("serv"),
    nome: s.nome,
    descricao: s.descricao ?? "",
    duracao: s.duracao ?? "",
    preco: typeof s.preco === "number" ? s.preco : 0,
    ...(restantes[i] ? { imagem: restantes[i] } : {}),
  }));

  const usadasEmItens = Math.max(produtos.length, servicos.length);
  const sobrando = restantes.slice(usadasEmItens);
  const galeria = sobrando.map((url, i) => ({
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
  if (servicos.length) ativas.add("servicos");
  if (galeria.length) ativas.add("galeria");
  if (depoimentos.length) ativas.add("depoimentos");
  if (faq.length) ativas.add("faq");
  ativas.add("apresentacao");
  ativas.add("links");
  ativas.add("formulario");
  ativas.add("rodape");

  const secoes = base.secoes.map((secao) => ({
    ...secao,
    ativa: ativas.size > 4 ? ativas.has(secao.tipo) : secao.ativa,
  }));

  return {
    ...base,
    conteudo: {
      ...base.conteudo,
      descricao: plano.descricao || base.conteudo.descricao,
      ...(logo ? { logo } : {}),
      ...(capa ? { capa } : {}),
    },
    aparencia: {
      ...base.aparencia,
      corPrimaria: hex(plano.cores?.primaria) ?? base.aparencia.corPrimaria,
      corFundo: hex(plano.cores?.fundo) ?? base.aparencia.corFundo,
      corTexto: hex(plano.cores?.texto) ?? base.aparencia.corTexto,
      tema: temaEscolhido ?? plano.tema ?? base.aparencia.tema,
      capaTipo: capa ? "imagem" : base.aparencia.capaTipo,
      ...(estilo?.aparencia ?? {}),
    },
    secoes,
    produtos: produtos.length ? produtos : base.produtos,
    servicos: servicos.length ? servicos : base.servicos,
    galeria: galeria.length ? galeria : base.galeria,
    depoimentos,
    faq,
    formulario: {
      ...base.formulario,
      tipo: plano.formulario?.tipo ?? base.formulario.tipo,
      titulo: plano.formulario?.titulo ?? base.formulario.titulo,
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
