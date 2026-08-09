export type SegmentoId =
  | "alimentacao"
  | "beleza"
  | "comercio"
  | "servicos"
  | "saude"
  | "eventos"
  | "imoveis"
  | "transporte"
  | "profissionais";

export type StatusSite = "publicado" | "rascunho" | "pausado";

export type LayoutModelo =
  | "editorial"
  | "cards"
  | "catalogo"
  | "imersivo"
  | "minimalista"
  | "urbano"
  | "corporativo"
  | "colorido";

export type TipoSecao =
  | "apresentacao"
  | "links"
  | "produtos"
  | "servicos"
  | "cardapio"
  | "galeria"
  | "videos"
  | "depoimentos"
  | "equipe"
  | "promocao"
  | "cupom"
  | "localizacao"
  | "horarios"
  | "faq"
  | "formulario"
  | "rodape";

export type TipoLink =
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "site"
  | "telefone"
  | "email"
  | "localizacao"
  | "personalizado";

export interface Secao {
  id: string;
  tipo: TipoSecao;
  titulo: string;
  ativa: boolean;
}

export interface LinkItem {
  id: string;
  tipo: TipoLink;
  titulo: string;
  valor: string;
  cor?: string;
  ativo: boolean;
}

export interface Produto {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  precoPromocional?: number;
  categoria: string;
  variacoes: string[];
  imagem?: string;
  disponivel: boolean;
  destaque: boolean;
}

export interface Servico {
  id: string;
  nome: string;
  descricao: string;
  duracao: string;
  preco: number;
  profissional?: string;
  imagem?: string;
}

export interface ItemGaleria {
  id: string;
  url: string;
  titulo: string;
}

export interface Avaliacao {
  id: string;
  nome: string;
  foto?: string;
  nota: number;
  comentario: string;
  data: string;
  destaque: boolean;
}

export interface MembroEquipe {
  id: string;
  nome: string;
  funcao: string;
  foto?: string;
}

export interface Cupom {
  id: string;
  titulo: string;
  descricao: string;
  codigo: string;
  validade: string;
  ativo: boolean;
}

export interface PerguntaFrequente {
  id: string;
  pergunta: string;
  resposta: string;
}

export interface HorarioDia {
  dia: string;
  abre: string;
  fecha: string;
  fechado: boolean;
}

export type TipoFormulario = "orcamento" | "contato" | "reserva" | "agendamento" | "cotacao";

export interface CampoFormulario {
  id: string;
  rotulo: string;
  tipo: "texto" | "email" | "telefone" | "data" | "textarea";
  obrigatorio: boolean;
}

export interface EnvioFormulario {
  id: string;
  siteId: string;
  criadoEm: string;
  dados: Record<string, string>;
}

export interface Aparencia {
  corPrimaria: string;
  corFundo: string;
  corTexto: string;
  fonte: "moderna" | "elegante" | "tecnica" | "editorial";
  raio: number;
  botao: "solido" | "contorno" | "suave" | "pill";
  tema: "claro" | "escuro";
  animacoes: boolean;
  espacamento: "compacto" | "confortavel" | "amplo";
  layout: LayoutModelo;
  capaTipo: "imagem" | "cor";
}

export interface Integracoes {
  googleAnalytics: string;
  metaPixel: string;
  dominio: string;
  googleMaps: string;
  whatsappApi: string;
}

export interface Seo {
  titulo: string;
  descricao: string;
  imagem?: string;
  palavras: string;
}

export interface Cliente {
  empresa: string;
  segmento: SegmentoId;
  responsavel: string;
  telefone: string;
  email: string;
  cidade: string;
  estado: string;
}

export interface Conteudo {
  nome: string;
  descricao: string;
  logo?: string;
  capa?: string;
  telefone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  endereco: string;
  horarios: HorarioDia[];
}

export interface Metricas {
  visitas: number;
  cliquesWhatsapp: number;
  solicitacoes: number;
  serie: { dia: string; visitas: number; cliques: number }[];
  origens: { nome: string; valor: number }[];
  horarios: { hora: string; valor: number }[];
}

export interface Site {
  id: string;
  slug: string;
  status: StatusSite;
  modeloId: string;
  criadoEm: string;
  atualizadoEm: string;
  cliente: Cliente;
  conteudo: Conteudo;
  aparencia: Aparencia;
  secoes: Secao[];
  links: LinkItem[];
  produtos: Produto[];
  servicos: Servico[];
  galeria: ItemGaleria[];
  depoimentos: Avaliacao[];
  equipe: MembroEquipe[];
  cupons: Cupom[];
  faq: PerguntaFrequente[];
  formulario: { tipo: TipoFormulario; titulo: string; campos: CampoFormulario[] };
  seo: Seo;
  integracoes: Integracoes;
  metricas: Metricas;
}

export interface Modelo {
  id: string;
  nome: string;
  segmento: SegmentoId;
  layout: LayoutModelo;
  descricao: string;
  destaque: string;
  paleta: { fundo: string; texto: string; primaria: string; suave: string };
  imagem: string;
}
