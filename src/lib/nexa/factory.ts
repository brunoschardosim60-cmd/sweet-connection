import { modeloPorId } from "./modelos";
import { diasSemana, uid } from "./utils";
import type { Cliente, Secao, Site, TipoSecao } from "./types";

export const secoesPadrao: { tipo: TipoSecao; titulo: string; ativa: boolean }[] = [
  { tipo: "apresentacao", titulo: "Apresentação", ativa: true },
  { tipo: "links", titulo: "Links rápidos", ativa: true },
  { tipo: "produtos", titulo: "Produtos", ativa: false },
  { tipo: "servicos", titulo: "Serviços", ativa: true },
  { tipo: "cardapio", titulo: "Cardápio", ativa: false },
  { tipo: "galeria", titulo: "Galeria", ativa: true },
  { tipo: "videos", titulo: "Vídeos", ativa: false },
  { tipo: "depoimentos", titulo: "Depoimentos", ativa: true },
  { tipo: "equipe", titulo: "Equipe", ativa: false },
  { tipo: "promocao", titulo: "Promoção", ativa: false },
  { tipo: "cupom", titulo: "Cupom", ativa: false },
  { tipo: "localizacao", titulo: "Localização", ativa: true },
  { tipo: "horarios", titulo: "Horários", ativa: true },
  { tipo: "faq", titulo: "Perguntas frequentes", ativa: false },
  { tipo: "formulario", titulo: "Formulário", ativa: false },
  { tipo: "rodape", titulo: "Rodapé", ativa: true },
];

export const criarSecoes = (): Secao[] =>
  secoesPadrao.map((s) => ({ id: uid("sec"), ...s }));

export const horariosPadrao = () =>
  diasSemana.map((dia, i) => ({
    dia,
    abre: "09:00",
    fecha: i === 5 ? "16:00" : "18:00",
    fechado: i === 6,
  }));

export function serieMetricas(base = 120) {
  const serie = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const visitas = Math.round(base * (0.6 + Math.sin(i / 3) * 0.2 + Math.random() * 0.5));
    return {
      dia: d.toISOString().slice(0, 10),
      visitas,
      cliques: Math.round(visitas * (0.16 + Math.random() * 0.12)),
    };
  });
  return serie;
}

export function metricasPadrao(base = 120) {
  const serie = serieMetricas(base);
  return {
    visitas: serie.reduce((t, s) => t + s.visitas, 0),
    cliquesWhatsapp: serie.reduce((t, s) => t + s.cliques, 0),
    solicitacoes: Math.round(base / 4),
    serie,
    origens: [
      { nome: "Instagram", valor: 42 },
      { nome: "WhatsApp", valor: 27 },
      { nome: "Google", valor: 18 },
      { nome: "QR Code", valor: 8 },
      { nome: "Direto", valor: 5 },
    ],
    horarios: ["08h", "10h", "12h", "14h", "16h", "18h", "20h", "22h"].map((hora, i) => ({
      hora,
      valor: Math.round(20 + Math.sin(i / 1.6) * 14 + Math.random() * 12),
    })),
  };
}

export function criarSite(cliente: Cliente, modeloId: string, slug: string): Site {
  const modelo = modeloPorId(modeloId);
  const agora = new Date().toISOString();
  return {
    id: uid("site"),
    slug,
    status: "rascunho",
    modeloId: modelo.id,
    criadoEm: agora,
    atualizadoEm: agora,
    cliente,
    conteudo: {
      nome: cliente.empresa,
      descricao: "",
      capa: modelo.imagem,
      telefone: cliente.telefone,
      whatsapp: cliente.telefone,
      email: cliente.email,
      instagram: "",
      endereco: `${cliente.cidade} - ${cliente.estado}`,
      horarios: horariosPadrao(),
    },
    aparencia: {
      corPrimaria: modelo.paleta.primaria,
      corFundo: modelo.paleta.fundo,
      corTexto: modelo.paleta.texto,
      fonte: "moderna",
      raio: 16,
      botao: "solido",
      tema: modelo.paleta.fundo.startsWith("#0") || modelo.paleta.fundo.startsWith("#1")
        ? "escuro"
        : "claro",
      animacoes: true,
      espacamento: "confortavel",
      layout: modelo.layout,
      capaTipo: "imagem",
    },
    secoes: criarSecoes(),
    links: [],
    produtos: [],
    servicos: [],
    galeria: [],
    depoimentos: [],
    equipe: [],
    cupons: [],
    faq: [],
    formulario: {
      tipo: "orcamento",
      titulo: "Solicite um orçamento",
      campos: [
        { id: uid("c"), rotulo: "Nome", tipo: "texto", obrigatorio: true },
        { id: uid("c"), rotulo: "WhatsApp", tipo: "telefone", obrigatorio: true },
        { id: uid("c"), rotulo: "Mensagem", tipo: "textarea", obrigatorio: false },
      ],
    },
    seo: {
      titulo: cliente.empresa,
      descricao: `${cliente.empresa} em ${cliente.cidade} - ${cliente.estado}`,
      imagem: modelo.imagem,
      palavras: "",
    },
    integracoes: {
      googleAnalytics: "",
      metaPixel: "",
      dominio: "",
      googleMaps: "",
      whatsappApi: "",
    },
    metricas: metricasPadrao(40),
  };
}
