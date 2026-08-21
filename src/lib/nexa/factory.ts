import { modeloPorId } from "./modelos";
import { diasSemana, uid } from "./utils";
import type { Cliente, Secao, Site, TipoSecao } from "./types";

type PresetModelo = {
  secoes: TipoSecao[];
  formulario: Site["formulario"]["tipo"];
  tituloFormulario: string;
  /** Títulos próprios do segmento para as seções padrão (apenas visual). */
  titulos?: Partial<Record<TipoSecao, string>>;
};

const BASE: TipoSecao[] = ["apresentacao", "links"];
const FINAL: TipoSecao[] = ["localizacao", "horarios", "rodape"];

export const presetsModelo: Record<string, PresetModelo> = {
  "restaurante-moderno": {
    secoes: [
      ...BASE,
      "cardapio",
      "produtos",
      "galeria",
      "depoimentos",
      "cupom",
      "formulario",
      ...FINAL,
    ],
    formulario: "reserva",
    tituloFormulario: "Solicite uma reserva",
    titulos: { produtos: "Pratos da casa", galeria: "O ambiente" },
  },
  "hamburgueria-urbana": {
    secoes: [...BASE, "produtos", "promocao", "cupom", "formulario", ...FINAL],
    formulario: "contato",
    tituloFormulario: "Faça seu pedido",
    titulos: { produtos: "Cardápio", promocao: "Combos do dia" },
  },
  "loja-roupas": {
    secoes: [
      ...BASE,
      "produtos",
      "galeria",
      "promocao",
      "cupom",
      "formulario",
      "localizacao",
      "rodape",
    ],
    formulario: "contato",
    tituloFormulario: "Consulte disponibilidade",
    titulos: { produtos: "Coleção", galeria: "Looks" },
  },
  cosmeticos: {
    secoes: [
      ...BASE,
      "produtos",
      "galeria",
      "depoimentos",
      "promocao",
      "cupom",
      "formulario",
      "rodape",
    ],
    formulario: "contato",
    tituloFormulario: "Fale com a loja",
    titulos: { produtos: "Produtos e kits" },
  },
  "barbearia-premium": {
    secoes: [...BASE, "servicos", "equipe", "galeria", "depoimentos", "formulario", ...FINAL],
    formulario: "agendamento",
    tituloFormulario: "Agende seu horário",
    titulos: { servicos: "Serviços", equipe: "Barbeiros", galeria: "Antes e depois" },
  },
  "salao-beleza": {
    secoes: [
      ...BASE,
      "servicos",
      "equipe",
      "galeria",
      "depoimentos",
      "cupom",
      "formulario",
      ...FINAL,
    ],
    formulario: "agendamento",
    tituloFormulario: "Agende seu atendimento",
    titulos: { equipe: "Profissionais", galeria: "Trabalhos" },
  },
  clinica: {
    secoes: [...BASE, "servicos", "equipe", "depoimentos", "faq", "formulario", ...FINAL],
    formulario: "agendamento",
    tituloFormulario: "Solicite um agendamento",
    titulos: { servicos: "Especialidades", equipe: "Corpo clínico" },
  },
  "personal-trainer": {
    secoes: [...BASE, "servicos", "videos", "depoimentos", "formulario", "rodape"],
    formulario: "contato",
    tituloFormulario: "Solicite uma avaliação",
    titulos: { servicos: "Planos de treino", videos: "Resultados em vídeo" },
  },
  fotografo: {
    secoes: [...BASE, "servicos", "galeria", "depoimentos", "formulario", "rodape"],
    formulario: "orcamento",
    tituloFormulario: "Peça seu orçamento",
    titulos: { servicos: "Pacotes", galeria: "Portfólio" },
  },
  corretor: {
    secoes: [...BASE, "produtos", "galeria", "formulario", "localizacao", "rodape"],
    formulario: "contato",
    tituloFormulario: "Agende uma visita",
    titulos: { produtos: "Imóveis em destaque", galeria: "Fotos dos imóveis" },
  },
  transportadora: {
    secoes: [...BASE, "servicos", "faq", "formulario", "localizacao", "rodape"],
    formulario: "cotacao",
    tituloFormulario: "Solicite uma cotação",
    titulos: { servicos: "Serviços e áreas atendidas" },
  },
  advocacia: {
    secoes: [...BASE, "servicos", "equipe", "faq", "formulario", "localizacao", "rodape"],
    formulario: "contato",
    tituloFormulario: "Solicite um contato",
    titulos: { servicos: "Áreas de atuação", equipe: "Advogados" },
  },
  "prestador-servicos": {
    secoes: [...BASE, "servicos", "galeria", "depoimentos", "faq", "formulario", ...FINAL],
    formulario: "orcamento",
    tituloFormulario: "Solicite um orçamento",
    titulos: { servicos: "O que fazemos", galeria: "Trabalhos realizados" },
  },
  petshop: {
    secoes: [...BASE, "servicos", "produtos", "galeria", "equipe", "formulario", ...FINAL],
    formulario: "agendamento",
    tituloFormulario: "Agende o atendimento do seu pet",
    titulos: { servicos: "Serviços", produtos: "Lojinha" },
  },
  odontologia: {
    secoes: [...BASE, "servicos", "equipe", "depoimentos", "faq", "formulario", ...FINAL],
    formulario: "agendamento",
    tituloFormulario: "Agende sua avaliação",
    titulos: { servicos: "Tratamentos", equipe: "Equipe" },
  },
  mecanica: {
    secoes: [...BASE, "servicos", "galeria", "faq", "formulario", ...FINAL],
    formulario: "orcamento",
    tituloFormulario: "Solicite um orçamento",
    titulos: { servicos: "Serviços da oficina", galeria: "Nossa estrutura" },
  },
  pizzaria: {
    secoes: [...BASE, "cardapio", "produtos", "promocao", "cupom", "formulario", ...FINAL],
    formulario: "contato",
    tituloFormulario: "Faça seu pedido",
    titulos: { produtos: "Sabores", promocao: "Promoções do dia" },
  },
  doceria: {
    secoes: [...BASE, "produtos", "galeria", "promocao", "cupom", "formulario", "rodape"],
    formulario: "orcamento",
    tituloFormulario: "Solicite sua encomenda",
    titulos: { produtos: "Vitrine de doces" },
  },
  "eventos-festas": {
    secoes: [
      ...BASE,
      "servicos",
      "galeria",
      "depoimentos",
      "equipe",
      "faq",
      "formulario",
      "rodape",
    ],
    formulario: "orcamento",
    tituloFormulario: "Solicite um orçamento para seu evento",
    titulos: { servicos: "Pacotes de festa", galeria: "Eventos realizados" },
  },
  "academia-studio": {
    secoes: [
      ...BASE,
      "servicos",
      "produtos",
      "equipe",
      "horarios",
      "depoimentos",
      "galeria",
      "faq",
      "formulario",
      "localizacao",
      "rodape",
    ],
    formulario: "agendamento",
    tituloFormulario: "Agende sua aula experimental",
    titulos: {
      servicos: "Modalidades",
      produtos: "Planos",
      equipe: "Professores",
      horarios: "Grade de horários",
    },
  },
  "tattoo-studio": {
    secoes: [
      ...BASE,
      "galeria",
      "servicos",
      "equipe",
      "depoimentos",
      "faq",
      "formulario",
      ...FINAL,
    ],
    formulario: "orcamento",
    tituloFormulario: "Peça seu orçamento",
    titulos: {
      galeria: "Portfólio",
      servicos: "Estilos",
      equipe: "Artistas",
      faq: "Cuidados e dúvidas",
    },
  },
  "construcao-arquitetura": {
    secoes: [
      ...BASE,
      "servicos",
      "galeria",
      "depoimentos",
      "equipe",
      "faq",
      "formulario",
      ...FINAL,
    ],
    formulario: "orcamento",
    tituloFormulario: "Solicite um orçamento de obra",
    titulos: {
      galeria: "Obras realizadas",
      servicos: "Serviços",
      faq: "Como trabalhamos",
      equipe: "Time técnico",
    },
  },
  "pousada-hotel": {
    secoes: [
      ...BASE,
      "produtos",
      "galeria",
      "servicos",
      "depoimentos",
      "faq",
      "formulario",
      ...FINAL,
    ],
    formulario: "reserva",
    tituloFormulario: "Consulte disponibilidade",
    titulos: { produtos: "Acomodações", servicos: "Comodidades", galeria: "A pousada" },
  },
};

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

/** Base em branco do modelo personalizado: só o essencial fica ativo. */
const ATIVAS_PERSONALIZADO: TipoSecao[] = ["apresentacao", "links", "rodape"];

export const criarSecoes = (modeloId?: string): Secao[] => {
  if (modeloId === "personalizado") {
    return secoesPadrao.map((secao) => ({
      id: uid("sec"),
      ...secao,
      ativa: ATIVAS_PERSONALIZADO.includes(secao.tipo),
    }));
  }
  const preset = modeloId ? presetsModelo[modeloId] : undefined;
  if (!preset) return secoesPadrao.map((secao) => ({ id: uid("sec"), ...secao }));

  const porTipo = new Map(secoesPadrao.map((secao) => [secao.tipo, secao]));
  const ordenadas = [
    ...preset.secoes,
    ...secoesPadrao.map((secao) => secao.tipo).filter((tipo) => !preset.secoes.includes(tipo)),
  ];
  return ordenadas.map((tipo) => {
    const secao = porTipo.get(tipo)!;
    return {
      id: uid("sec"),
      ...secao,
      titulo: preset.titulos?.[tipo] ?? secao.titulo,
      ativa: preset.secoes.includes(tipo),
    };
  });
};

function camposFormulario(tipo: Site["formulario"]["tipo"]): Site["formulario"]["campos"] {
  const campos: Site["formulario"]["campos"] = [
    { id: uid("c"), rotulo: "Nome", tipo: "texto", obrigatorio: true },
    { id: uid("c"), rotulo: "WhatsApp", tipo: "telefone", obrigatorio: true },
  ];
  if (tipo === "reserva" || tipo === "agendamento") {
    campos.push({ id: uid("c"), rotulo: "Data desejada", tipo: "data", obrigatorio: true });
  }
  campos.push({ id: uid("c"), rotulo: "Mensagem", tipo: "textarea", obrigatorio: false });
  return campos;
}

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

export function metricasVazias() {
  return {
    visitas: 0,
    cliquesWhatsapp: 0,
    solicitacoes: 0,
    serie: [],
    origens: [],
    horarios: [],
  };
}

export function criarSite(cliente: Cliente, modeloId: string, slug: string): Site {
  const modelo = modeloPorId(modeloId);
  const preset = presetsModelo[modelo.id] ?? presetsModelo["prestador-servicos"]!;
  const emBranco = modelo.id === "personalizado";
  const agora = new Date().toISOString();
  return {
    id: uid("site"),
    slug,
    status: "rascunho",
    modeloId: modelo.id,
    criadoEm: agora,
    atualizadoEm: agora,
    expiraEm: null,
    cliente,
    conteudo: {
      nome: cliente.empresa,
      descricao: "",
      ...(emBranco ? {} : { capa: modelo.imagem }),
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
      tema:
        modelo.paleta.fundo.startsWith("#0") || modelo.paleta.fundo.startsWith("#1")
          ? "escuro"
          : "claro",
      animacoes: true,
      espacamento: "confortavel",
      layout: modelo.layout,
      capaTipo: emBranco ? "cor" : "imagem",
    },
    secoes: criarSecoes(modelo.id),
    links: cliente.telefone
      ? [
          {
            id: uid("link"),
            tipo: "whatsapp",
            titulo: "Falar no WhatsApp",
            valor: cliente.telefone,
            ativo: true,
          },
        ]
      : [],
    produtos: [],
    servicos: [],
    galeria: [],
    depoimentos: [],
    equipe: [],
    cupons: [],
    faq: [],
    formulario: {
      tipo: preset.formulario,
      titulo: preset.tituloFormulario,
      campos: camposFormulario(preset.formulario),
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
    metricas: metricasVazias(),
  };
}
