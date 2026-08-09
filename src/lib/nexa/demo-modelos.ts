import { criarSecoes, horariosPadrao, metricasPadrao } from "./factory";
import { imagens } from "./images";
import { modeloPorId, modelos } from "./modelos";
import type { Site, TipoSecao } from "./types";

const conteudoPorModelo: Record<
  string,
  {
    nome: string;
    descricao: string;
    cidade: string;
    estado: string;
    whatsapp: string;
    instagram: string;
    endereco: string;
    secoes: TipoSecao[];
    produtos?: Site["produtos"];
    servicos?: Site["servicos"];
    equipe?: Site["equipe"];
    depoimentos?: Site["depoimentos"];
    faq?: Site["faq"];
  }
> = {
  "restaurante-moderno": {
    nome: "Cantina do Vale",
    descricao: "Massas artesanais e forno a lenha no coração de Campinas.",
    cidade: "Campinas",
    estado: "SP",
    whatsapp: "5519974123388",
    instagram: "cantinadovale",
    endereco: "Rua das Oliveiras, 340 - Cambuí, Campinas - SP",
    secoes: ["apresentacao", "cardapio", "produtos", "galeria", "depoimentos", "cupom", "localizacao", "horarios", "rodape"],
    produtos: [
      { id: "p1", nome: "Rondelli de funghi", descricao: "Massa fresca, creme de parmesão.", preco: 68.9, categoria: "Massas", variacoes: ["Individual", "Para dois"], imagem: imagens.restaurante, disponivel: true, destaque: true },
      { id: "p2", nome: "Margherita napoletana", descricao: "Fermentação de 48h.", preco: 59, precoPromocional: 49.9, categoria: "Pizzas", variacoes: ["Média", "Grande"], imagem: imagens.hamburgueria, disponivel: true, destaque: true },
      { id: "p3", nome: "Tiramisù da casa", descricao: "Receita da nonna.", preco: 27, categoria: "Sobremesas", variacoes: [], disponivel: true, destaque: false },
    ],
  },
  "hamburgueria-urbana": {
    nome: "Brasa 22",
    descricao: "Smash burgers na chapa, batata rústica e delivery até 23h.",
    cidade: "São Paulo",
    estado: "SP",
    whatsapp: "5511990012233",
    instagram: "brasa22",
    endereco: "Rua Augusta, 2210 - Consolação, São Paulo - SP",
    secoes: ["apresentacao", "produtos", "promocao", "depoimentos", "horarios", "localizacao", "rodape"],
    produtos: [
      { id: "p1", nome: "Smash duplo", descricao: "Dois blends de 90g, cheddar e picles.", preco: 34.9, categoria: "Burgers", variacoes: ["Simples", "Duplo", "Triplo"], imagem: imagens.hamburgueria, disponivel: true, destaque: true },
      { id: "p2", nome: "Combo Brasa", descricao: "Burger + fritas + refri lata.", preco: 49.9, precoPromocional: 42.9, categoria: "Combos", variacoes: [], imagem: imagens.hamburgueria, disponivel: true, destaque: true },
      { id: "p3", nome: "Fritas com cheddar", descricao: "Porção generosa com bacon.", preco: 26, categoria: "Acompanhamentos", variacoes: [], disponivel: true, destaque: false },
    ],
  },
  "loja-roupas": {
    nome: "Ateliê Lume",
    descricao: "Alfaiataria leve em pequenos lotes, feita em Belo Horizonte.",
    cidade: "Belo Horizonte",
    estado: "MG",
    whatsapp: "5531996542210",
    instagram: "atelie.lume",
    endereco: "Rua Fernandes Tourinho, 88 - Savassi, BH - MG",
    secoes: ["apresentacao", "produtos", "galeria", "depoimentos", "localizacao", "rodape"],
    produtos: [
      { id: "p1", nome: "Blazer linho areia", descricao: "Linho puro com forro em algodão.", preco: 489, categoria: "Alfaiataria", variacoes: ["P", "M", "G"], imagem: imagens.moda, disponivel: true, destaque: true },
      { id: "p2", nome: "Calça pantalona", descricao: "Cintura alta, caimento fluido.", preco: 329, precoPromocional: 279, categoria: "Alfaiataria", variacoes: ["36", "38", "40"], imagem: imagens.moda, disponivel: true, destaque: true },
      { id: "p3", nome: "Camisa seda off", descricao: "Toque frio, botões de madrepérola.", preco: 359, categoria: "Camisaria", variacoes: ["P", "M"], imagem: imagens.moda, disponivel: true, destaque: false },
    ],
  },
  cosmeticos: {
    nome: "Pele Viva Cosméticos",
    descricao: "Skincare nacional, kits promocionais e frete grátis acima de R$ 199.",
    cidade: "Florianópolis",
    estado: "SC",
    whatsapp: "5548991234455",
    instagram: "peleviva",
    endereco: "Rua Bocaiúva, 500 - Centro, Florianópolis - SC",
    secoes: ["apresentacao", "produtos", "cupom", "depoimentos", "faq", "rodape"],
    produtos: [
      { id: "p1", nome: "Sérum vitamina C", descricao: "10% de ativo puro, 30ml.", preco: 139, categoria: "Rosto", variacoes: ["30ml"], imagem: imagens.cosmeticos, disponivel: true, destaque: true },
      { id: "p2", nome: "Kit hidratação", descricao: "Sabonete, tônico e hidratante.", preco: 249, precoPromocional: 199, categoria: "Kits", variacoes: [], imagem: imagens.cosmeticos, disponivel: true, destaque: true },
      { id: "p3", nome: "Protetor solar FPS 60", descricao: "Toque seco, sem oleosidade.", preco: 89, categoria: "Rosto", variacoes: [], imagem: imagens.cosmeticos, disponivel: true, destaque: false },
    ],
  },
  "barbearia-premium": {
    nome: "Navalha de Ouro",
    descricao: "Barbearia clássica com atendimento por hora marcada.",
    cidade: "Niterói",
    estado: "RJ",
    whatsapp: "5521988124477",
    instagram: "navalhadeouro",
    endereco: "Av. Amaral Peixoto, 120 - Centro, Niterói - RJ",
    secoes: ["apresentacao", "servicos", "equipe", "galeria", "depoimentos", "horarios", "localizacao", "rodape"],
    servicos: [
      { id: "s1", nome: "Corte social", descricao: "Máquina, tesoura e finalização.", duracao: "45 min", preco: 70, profissional: "Diego" },
      { id: "s2", nome: "Barba terapia", descricao: "Toalha quente, óleo e navalha.", duracao: "40 min", preco: 60, profissional: "Ricardo" },
      { id: "s3", nome: "Combo completo", descricao: "Corte + barba + sobrancelha.", duracao: "1h20", preco: 120, profissional: "Diego" },
    ],
    equipe: [
      { id: "e1", nome: "Diego Menezes", funcao: "Barbeiro-chefe" },
      { id: "e2", nome: "Ricardo Alves", funcao: "Barbeiro" },
    ],
  },
  "salao-beleza": {
    nome: "Studio Áurea",
    descricao: "Cabelo, unhas e estética avançada com hora marcada.",
    cidade: "Recife",
    estado: "PE",
    whatsapp: "5581994448877",
    instagram: "studioaurea",
    endereco: "Rua da Hora, 410 - Espinheiro, Recife - PE",
    secoes: ["apresentacao", "servicos", "equipe", "galeria", "depoimentos", "horarios", "rodape"],
    servicos: [
      { id: "s1", nome: "Corte + escova", descricao: "Lavagem, corte e finalização.", duracao: "1h", preco: 120, profissional: "Aline" },
      { id: "s2", nome: "Coloração", descricao: "Coloração completa com tratamento.", duracao: "2h30", preco: 320, profissional: "Bruna" },
      { id: "s3", nome: "Manicure e pedicure", descricao: "Esmaltação em gel inclusa.", duracao: "1h20", preco: 95, profissional: "Sandra" },
    ],
    equipe: [
      { id: "e1", nome: "Aline Cordeiro", funcao: "Hair stylist" },
      { id: "e2", nome: "Bruna Sales", funcao: "Colorista" },
    ],
  },
  clinica: {
    nome: "Clínica Vitalis",
    descricao: "Consultas, exames e acompanhamento multidisciplinar.",
    cidade: "Goiânia",
    estado: "GO",
    whatsapp: "5562982771190",
    instagram: "clinicavitalis",
    endereco: "Av. T-9, 1500 - Setor Bueno, Goiânia - GO",
    secoes: ["apresentacao", "servicos", "equipe", "faq", "formulario", "horarios", "localizacao", "rodape"],
    servicos: [
      { id: "s1", nome: "Clínica geral", descricao: "Consulta de rotina.", duracao: "40 min", preco: 280 },
      { id: "s2", nome: "Nutrição", descricao: "Plano alimentar individualizado.", duracao: "50 min", preco: 240 },
      { id: "s3", nome: "Cardiologia", descricao: "Avaliação com eletrocardiograma.", duracao: "1h", preco: 420 },
    ],
    faq: [{ id: "f1", pergunta: "Atendem convênios?", resposta: "Sim, os principais convênios nacionais." }],
  },
  "personal-trainer": {
    nome: "Marcos Vidal Treinamento",
    descricao: "Treinos personalizados presenciais e online para todos os níveis.",
    cidade: "Fortaleza",
    estado: "CE",
    whatsapp: "5585988776655",
    instagram: "marcosvidal.treino",
    endereco: "Av. Beira Mar, 3200 - Meireles, Fortaleza - CE",
    secoes: ["apresentacao", "servicos", "depoimentos", "galeria", "formulario", "rodape"],
    servicos: [
      { id: "s1", nome: "Consultoria online", descricao: "Treino atualizado a cada 4 semanas.", duracao: "Mensal", preco: 249 },
      { id: "s2", nome: "Personal presencial", descricao: "Acompanhamento individual.", duracao: "1h", preco: 130 },
    ],
  },
  fotografo: {
    nome: "Studio Clara Luz",
    descricao: "Ensaios editoriais, casamentos e fotografia de marca.",
    cidade: "Porto Alegre",
    estado: "RS",
    whatsapp: "5551983304412",
    instagram: "studioclaraluz",
    endereco: "Rua Padre Chagas, 210 - Porto Alegre - RS",
    secoes: ["apresentacao", "galeria", "servicos", "depoimentos", "formulario", "rodape"],
    servicos: [
      { id: "s1", nome: "Ensaio editorial", descricao: "2h de sessão, 30 fotos tratadas.", duracao: "2h", preco: 1200 },
      { id: "s2", nome: "Fotografia de marca", descricao: "Banco de imagens para redes.", duracao: "4h", preco: 2400 },
    ],
  },
  corretor: {
    nome: "Ricardo Paiva Imóveis",
    descricao: "Apartamentos e casas selecionados na zona sul de São Paulo.",
    cidade: "São Paulo",
    estado: "SP",
    whatsapp: "5511987001122",
    instagram: "ricardopaivaimoveis",
    endereco: "Av. Santo Amaro, 1800 - Brooklin, São Paulo - SP",
    secoes: ["apresentacao", "produtos", "depoimentos", "formulario", "localizacao", "rodape"],
    produtos: [
      { id: "p1", nome: "Apto 2 dorm. Brooklin", descricao: "68m², 1 vaga, lazer completo.", preco: 690000, categoria: "Apartamentos", variacoes: [], imagem: imagens.imoveis, disponivel: true, destaque: true },
      { id: "p2", nome: "Cobertura Campo Belo", descricao: "140m², terraço com churrasqueira.", preco: 1480000, categoria: "Coberturas", variacoes: [], imagem: imagens.imoveis, disponivel: true, destaque: true },
    ],
  },
  transportadora: {
    nome: "Rota Norte Transportes",
    descricao: "Cargas fracionadas e dedicadas para todo o Sul e Sudeste.",
    cidade: "Curitiba",
    estado: "PR",
    whatsapp: "5541991207788",
    instagram: "rotanortetransportes",
    endereco: "BR-116, km 92 - Curitiba - PR",
    secoes: ["apresentacao", "servicos", "formulario", "faq", "localizacao", "rodape"],
    servicos: [
      { id: "s1", nome: "Carga fracionada", descricao: "Coletas diárias na região metropolitana.", duracao: "24-72h", preco: 0 },
      { id: "s2", nome: "Carga dedicada", descricao: "Veículo exclusivo com rastreamento.", duracao: "Sob demanda", preco: 0 },
    ],
    faq: [{ id: "f1", pergunta: "Quais regiões vocês atendem?", resposta: "Todo o Sul e Sudeste, com parceiros no Centro-Oeste." }],
  },
  "prestador-servicos": {
    nome: "Alves Manutenção Predial",
    descricao: "Elétrica, hidráulica e reparos gerais com garantia de 90 dias.",
    cidade: "Salvador",
    estado: "BA",
    whatsapp: "5571991234433",
    instagram: "alvesmanutencao",
    endereco: "Rua Silveira Martins, 90 - Cabula, Salvador - BA",
    secoes: ["apresentacao", "servicos", "depoimentos", "formulario", "faq", "rodape"],
    servicos: [
      { id: "s1", nome: "Instalação elétrica", descricao: "Tomadas, quadros e iluminação.", duracao: "Sob avaliação", preco: 180 },
      { id: "s2", nome: "Reparo hidráulico", descricao: "Vazamentos e trocas de louças.", duracao: "Sob avaliação", preco: 160 },
    ],
  },
};

const depoimentosGenericos: Site["depoimentos"] = [
  { id: "d1", nome: "Fernanda Rocha", nota: 5, comentario: "Atendimento rápido e resultado acima do esperado.", data: "2026-06-18", destaque: true },
  { id: "d2", nome: "Luiz Henrique", nota: 5, comentario: "Fácil de encontrar tudo e falar pelo WhatsApp.", data: "2026-05-30", destaque: false },
];

export function siteDoModelo(modeloId: string): Site {
  const modelo = modeloPorId(modeloId);
  const c = conteudoPorModelo[modelo.id] ?? conteudoPorModelo["prestador-servicos"]!;
  const agora = new Date().toISOString();
  return {
    id: `demo_${modelo.id}`,
    slug: modelo.id,
    status: "publicado",
    modeloId: modelo.id,
    criadoEm: agora,
    atualizadoEm: agora,
    cliente: {
      empresa: c.nome,
      segmento: modelo.segmento,
      responsavel: "Equipe " + c.nome,
      telefone: c.whatsapp,
      email: `contato@${modelo.id}.com.br`,
      cidade: c.cidade,
      estado: c.estado,
    },
    conteudo: {
      nome: c.nome,
      descricao: c.descricao,
      capa: modelo.imagem,
      telefone: c.whatsapp,
      whatsapp: c.whatsapp,
      email: `contato@${modelo.id}.com.br`,
      instagram: c.instagram,
      endereco: c.endereco,
      horarios: horariosPadrao(),
    },
    aparencia: {
      corPrimaria: modelo.paleta.primaria,
      corFundo: modelo.paleta.fundo,
      corTexto: modelo.paleta.texto,
      fonte: modelo.layout === "editorial" || modelo.layout === "minimalista" ? "elegante" : "moderna",
      raio: modelo.layout === "minimalista" ? 2 : modelo.layout === "colorido" ? 24 : 14,
      botao: modelo.layout === "minimalista" ? "contorno" : "solido",
      tema: ["#0", "#1", "#2"].some((p) => modelo.paleta.fundo.startsWith(p)) ? "escuro" : "claro",
      animacoes: true,
      espacamento: "confortavel",
      layout: modelo.layout,
      capaTipo: "imagem",
    },
    secoes: criarSecoes().map((s) => ({ ...s, ativa: c.secoes.includes(s.tipo) })),
    links: [
      { id: "l1", tipo: "whatsapp", titulo: "Falar no WhatsApp", valor: c.whatsapp, ativo: true },
      { id: "l2", tipo: "instagram", titulo: `@${c.instagram}`, valor: c.instagram, ativo: true },
      { id: "l3", tipo: "localizacao", titulo: "Como chegar", valor: c.endereco, ativo: true },
    ],
    produtos: c.produtos ?? [],
    servicos: c.servicos ?? [],
    galeria: [
      { id: "g1", url: modelo.imagem, titulo: c.nome },
      { id: "g2", url: imagens.moda, titulo: "Detalhes" },
      { id: "g3", url: imagens.salao, titulo: "Ambiente" },
    ],
    depoimentos: c.depoimentos ?? depoimentosGenericos,
    equipe: c.equipe ?? [],
    cupons: [
      { id: "cp1", titulo: "10% na primeira compra", descricao: "Use no atendimento pelo WhatsApp.", codigo: "BEMVINDO10", validade: "2026-12-31", ativo: true },
    ],
    faq: c.faq ?? [
      { id: "f1", pergunta: "Como faço para contratar?", resposta: "Fale conosco pelo WhatsApp e retornamos em minutos." },
    ],
    formulario: {
      tipo: "orcamento",
      titulo: "Peça um orçamento",
      campos: [
        { id: "c1", rotulo: "Nome", tipo: "texto", obrigatorio: true },
        { id: "c2", rotulo: "WhatsApp", tipo: "telefone", obrigatorio: true },
        { id: "c3", rotulo: "Mensagem", tipo: "textarea", obrigatorio: false },
      ],
    },
    seo: { titulo: c.nome, descricao: c.descricao, imagem: modelo.imagem, palavras: modelo.nome },
    integracoes: { googleAnalytics: "", metaPixel: "", dominio: "", googleMaps: "", whatsappApi: "" },
    metricas: metricasPadrao(80),
  };
}

export const sitesDeTodosModelos = () => modelos.map((m) => siteDoModelo(m.id));
