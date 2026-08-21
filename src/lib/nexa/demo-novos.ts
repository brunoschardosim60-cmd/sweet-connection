import { imagens } from "./images";
import type { Site, TipoSecao } from "./types";

/**
 * Conteúdo demonstrativo completo dos modelos novos (academia, tattoo,
 * construção e pousada). Usado apenas nas demonstrações e como ponto de
 * partida de novos mini-sites — nunca sobrescreve dados reais de clientes.
 */
export type ConteudoDemo = {
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
  videos?: Site["videos"];
  cta?: string;
  formulario?: Site["formulario"];
  galeria?: Site["galeria"];
  cupons?: Site["cupons"];
  logoFormato?: Site["aparencia"]["logoFormato"];
};

export const conteudoNovosModelos: Record<string, ConteudoDemo> = {
  "academia-studio": {
    nome: "Studio Corpo Livre (demonstração)",
    descricao:
      "Pilates, funcional e treino personalizado em turmas de até 5 alunos, com avaliação inicial gratuita.",
    cidade: "Florianópolis",
    estado: "SC",
    whatsapp: "5548991220044",
    instagram: "studiocorpolivre.demo",
    endereco: "Rua Lauro Linhares, 890 - Trindade, Florianópolis - SC",
    cta: "Agendar aula experimental",
    logoFormato: "redondo",
    secoes: [
      "apresentacao",
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
    servicos: [
      {
        id: "s1",
        nome: "Pilates solo e aparelhos",
        descricao: "Turmas reduzidas com acompanhamento individual em cada exercício.",
        duracao: "50 min",
        preco: 0,
        profissional: "Camila Reis",
        imagem: imagens.academia,
      },
      {
        id: "s2",
        nome: "Treino funcional",
        descricao: "Circuitos de força e mobilidade com progressão semanal.",
        duracao: "45 min",
        preco: 0,
        profissional: "Diego Matos",
      },
      {
        id: "s3",
        nome: "Personal individual",
        descricao: "Programa exclusivo montado a partir da sua avaliação física.",
        duracao: "1h",
        preco: 0,
        profissional: "Diego Matos",
      },
      {
        id: "s4",
        nome: "Aula experimental",
        descricao: "Primeira aula sem custo para conhecer o studio e os professores.",
        duracao: "50 min",
        preco: 0,
      },
    ],
    produtos: [
      {
        id: "p1",
        nome: "Plano 2x por semana",
        descricao: "Mensal, com avaliação física trimestral inclusa.",
        preco: 249,
        categoria: "Planos",
        variacoes: ["Pilates", "Funcional"],
        imagem: imagens.academia,
        disponivel: true,
        destaque: true,
      },
      {
        id: "p2",
        nome: "Plano 3x por semana",
        descricao: "Mensal, com plano de treino revisado a cada 30 dias.",
        preco: 329,
        precoPromocional: 289,
        categoria: "Planos",
        variacoes: ["Pilates", "Funcional", "Misto"],
        disponivel: true,
        destaque: true,
      },
      {
        id: "p3",
        nome: "Personal 8 sessões",
        descricao: "Pacote mensal individual com horários combinados.",
        preco: 640,
        categoria: "Planos",
        variacoes: [],
        disponivel: true,
        destaque: false,
      },
    ],
    equipe: [
      {
        id: "e1",
        nome: "Camila Reis",
        funcao: "Fisioterapeuta e instrutora de pilates",
        foto: imagens.academia,
      },
      { id: "e2", nome: "Diego Matos", funcao: "Educador físico - funcional e personal" },
      { id: "e3", nome: "Aline Souza", funcao: "Instrutora de mobilidade e alongamento" },
    ],
    galeria: [
      { id: "g1", url: imagens.academia, titulo: "Sala de aparelhos" },
      { id: "g2", url: imagens.fitness, titulo: "Área de treino funcional" },
    ],
    depoimentos: [
      {
        id: "d1",
        nome: "Patrícia (demonstração)",
        nota: 5,
        comentario:
          "Minhas dores nas costas sumiram em dois meses de pilates. Turma pequena faz diferença.",
        data: "2026-06-04",
        destaque: true,
      },
      {
        id: "d2",
        nome: "Rodrigo (demonstração)",
        nota: 5,
        comentario: "Treino ajustado para minha rotina e horários flexíveis pela manhã.",
        data: "2026-05-18",
        destaque: false,
      },
    ],
    faq: [
      {
        id: "f1",
        pergunta: "Preciso ter experiência para começar?",
        resposta:
          "Não. A primeira aula é experimental e o professor adapta os exercícios ao seu nível.",
      },
      {
        id: "f2",
        pergunta: "Quantos alunos por turma?",
        resposta: "No máximo 5 alunos, garantindo correção postural individual.",
      },
      {
        id: "f3",
        pergunta: "Existe fidelidade no plano?",
        resposta: "Os planos são mensais e podem ser trocados de modalidade a qualquer momento.",
      },
    ],
    formulario: {
      tipo: "agendamento",
      titulo: "Agende sua aula experimental",
      campos: [
        { id: "c1", rotulo: "Nome", tipo: "texto", obrigatorio: true },
        { id: "c2", rotulo: "WhatsApp", tipo: "telefone", obrigatorio: true },
        { id: "c3", rotulo: "Modalidade de interesse", tipo: "texto", obrigatorio: false },
        { id: "c4", rotulo: "Melhor data", tipo: "data", obrigatorio: true },
        { id: "c5", rotulo: "Horário preferido", tipo: "texto", obrigatorio: false },
      ],
    },
  },

  "tattoo-studio": {
    nome: "Agulha Preta Tattoo (demonstração)",
    descricao:
      "Estúdio de tatuagem autoral em blackwork, fineline e realismo, com orçamento por referência.",
    cidade: "Porto Alegre",
    estado: "RS",
    whatsapp: "5551998770022",
    instagram: "agulhapreta.demo",
    endereco: "Rua Padre Chagas, 145 - Moinhos de Vento, Porto Alegre - RS",
    cta: "Pedir orçamento",
    logoFormato: "quadrado",
    secoes: [
      "apresentacao",
      "galeria",
      "servicos",
      "equipe",
      "depoimentos",
      "faq",
      "formulario",
      "horarios",
      "localizacao",
      "rodape",
    ],
    servicos: [
      {
        id: "s1",
        nome: "Blackwork",
        descricao: "Traços sólidos e preenchimento em preto, do pequeno ao fechamento de braço.",
        duracao: "2h a 6h",
        preco: 0,
        profissional: "Nina Braga",
        imagem: imagens.tattoo,
      },
      {
        id: "s2",
        nome: "Fineline",
        descricao: "Linhas finas e delicadas, ideais para primeira tatuagem.",
        duracao: "1h a 3h",
        preco: 0,
        profissional: "Léo Duarte",
      },
      {
        id: "s3",
        nome: "Realismo",
        descricao: "Retratos e projetos autorais em preto e cinza, com sessões planejadas.",
        duracao: "4h a 8h",
        preco: 0,
        profissional: "Nina Braga",
      },
      {
        id: "s4",
        nome: "Cobertura e retoque",
        descricao: "Avaliação da tatuagem atual e proposta de novo desenho.",
        duracao: "Sob consulta",
        preco: 0,
      },
    ],
    equipe: [
      {
        id: "e1",
        nome: "Nina Braga",
        funcao: "Tatuadora - blackwork e realismo",
        foto: imagens.tattoo,
      },
      { id: "e2", nome: "Léo Duarte", funcao: "Tatuador - fineline e lettering" },
    ],
    galeria: [
      { id: "g1", url: imagens.tattoo, titulo: "Estúdio e cabine privativa" },
      { id: "g2", url: imagens.barbearia, titulo: "Projeto autoral em blackwork" },
      { id: "g3", url: imagens.fotografo, titulo: "Estudo de fineline" },
    ],
    depoimentos: [
      {
        id: "d1",
        nome: "Bruna (demonstração)",
        nota: 5,
        comentario:
          "Estúdio impecável e orçamento explicado antes de fechar. O desenho ficou melhor que a referência.",
        data: "2026-06-09",
        destaque: true,
      },
      {
        id: "d2",
        nome: "Vitor (demonstração)",
        nota: 5,
        comentario:
          "Sessão longa e confortável, com pausas combinadas e cuidados explicados no final.",
        data: "2026-04-27",
        destaque: false,
      },
    ],
    faq: [
      {
        id: "f1",
        pergunta: "Como funciona o orçamento?",
        resposta:
          "Envie a referência, o local do corpo e o tamanho aproximado pelo formulário. Respondemos com valor e tempo de sessão.",
      },
      {
        id: "f2",
        pergunta: "Precisa de sinal para agendar?",
        resposta: "Sim, um sinal confirma a data e é abatido do valor final da sessão.",
      },
      {
        id: "f3",
        pergunta: "Quais cuidados devo ter depois?",
        resposta:
          "Higienizar com sabão neutro, hidratar conforme orientação e evitar sol e mar por 15 dias.",
      },
    ],
    formulario: {
      tipo: "orcamento",
      titulo: "Peça seu orçamento",
      campos: [
        { id: "c1", rotulo: "Nome", tipo: "texto", obrigatorio: true },
        { id: "c2", rotulo: "WhatsApp", tipo: "telefone", obrigatorio: true },
        { id: "c3", rotulo: "Estilo desejado", tipo: "texto", obrigatorio: false },
        { id: "c4", rotulo: "Local do corpo e tamanho", tipo: "texto", obrigatorio: true },
        {
          id: "c5",
          rotulo: "Descreva a ideia ou referência",
          tipo: "textarea",
          obrigatorio: false,
        },
      ],
    },
  },

  "construcao-arquitetura": {
    nome: "Obra Viva Arquitetura (demonstração)",
    descricao:
      "Projetos, reformas e construção com cronograma definido e acompanhamento de obra semanal.",
    cidade: "Goiânia",
    estado: "GO",
    whatsapp: "5562993440077",
    instagram: "obraviva.demo",
    endereco: "Av. T-63, 1200 - Setor Bueno, Goiânia - GO",
    cta: "Solicitar orçamento",
    logoFormato: "quadrado",
    secoes: [
      "apresentacao",
      "servicos",
      "galeria",
      "depoimentos",
      "equipe",
      "faq",
      "formulario",
      "localizacao",
      "horarios",
      "rodape",
    ],
    servicos: [
      {
        id: "s1",
        nome: "Projeto arquitetônico",
        descricao: "Estudo preliminar, plantas, 3D e detalhamento executivo.",
        duracao: "30 a 60 dias",
        preco: 0,
        profissional: "Arq. Helena Prado",
        imagem: imagens.construcao,
      },
      {
        id: "s2",
        nome: "Reforma residencial",
        descricao: "Demolição, alvenaria, elétrica, hidráulica e acabamentos com equipe própria.",
        duracao: "45 a 120 dias",
        preco: 0,
      },
      {
        id: "s3",
        nome: "Construção completa",
        descricao: "Da fundação à entrega das chaves, com medição por etapa.",
        duracao: "8 a 14 meses",
        preco: 0,
      },
      {
        id: "s4",
        nome: "Gerenciamento de obra",
        descricao: "Cronograma, compras e relatório fotográfico semanal.",
        duracao: "Mensal",
        preco: 0,
      },
    ],
    equipe: [
      {
        id: "e1",
        nome: "Helena Prado",
        funcao: "Arquiteta responsável",
        foto: imagens.construcao,
      },
      { id: "e2", nome: "Marcos Ribeiro", funcao: "Engenheiro civil - execução" },
      { id: "e3", nome: "Sandra Melo", funcao: "Coordenação de obras e compras" },
    ],
    galeria: [
      { id: "g1", url: imagens.construcao, titulo: "Residência entregue - fachada" },
      { id: "g2", url: imagens.imoveis, titulo: "Reforma de apartamento" },
      { id: "g3", url: imagens.servicos, titulo: "Acompanhamento de obra" },
    ],
    depoimentos: [
      {
        id: "d1",
        nome: "Família Andrade (demonstração)",
        nota: 5,
        comentario:
          "Cronograma cumprido e relatório toda semana. Reforma entregue sem surpresa no orçamento.",
        data: "2026-05-22",
        destaque: true,
      },
      {
        id: "d2",
        nome: "Cláudio (demonstração)",
        nota: 5,
        comentario:
          "Projeto 3D ajudou muito a decidir. A execução ficou igual ao que foi apresentado.",
        data: "2026-03-30",
        destaque: false,
      },
    ],
    faq: [
      {
        id: "f1",
        pergunta: "Como funciona o processo de trabalho?",
        resposta:
          "Visita técnica, estudo preliminar, orçamento por etapa, execução com cronograma e entrega com vistoria.",
      },
      {
        id: "f2",
        pergunta: "Vocês fazem apenas o projeto?",
        resposta: "Sim. É possível contratar só o projeto, só a execução ou o pacote completo.",
      },
      {
        id: "f3",
        pergunta: "Como acompanho o andamento?",
        resposta: "Enviamos relatório fotográfico semanal e um cronograma atualizado por etapa.",
      },
    ],
    formulario: {
      tipo: "orcamento",
      titulo: "Solicite um orçamento de obra",
      campos: [
        { id: "c1", rotulo: "Nome", tipo: "texto", obrigatorio: true },
        { id: "c2", rotulo: "WhatsApp", tipo: "telefone", obrigatorio: true },
        {
          id: "c3",
          rotulo: "Tipo de obra (projeto, reforma, construção)",
          tipo: "texto",
          obrigatorio: true,
        },
        { id: "c4", rotulo: "Metragem aproximada", tipo: "texto", obrigatorio: false },
        { id: "c5", rotulo: "Endereço do imóvel", tipo: "texto", obrigatorio: false },
        { id: "c6", rotulo: "Descreva o que precisa", tipo: "textarea", obrigatorio: false },
      ],
    },
  },

  "pousada-hotel": {
    nome: "Pousada Alto da Serra (demonstração)",
    descricao:
      "Chalés com vista para a serra, café da manhã colonial e piscina aquecida a 10 minutos do centro.",
    cidade: "Monte Verde",
    estado: "MG",
    whatsapp: "5535998110033",
    instagram: "altodaserra.demo",
    endereco: "Estrada da Pedra Redonda, km 4 - Monte Verde, Camanducaia - MG",
    cta: "Consultar disponibilidade",
    logoFormato: "redondo",
    secoes: [
      "apresentacao",
      "produtos",
      "galeria",
      "servicos",
      "depoimentos",
      "faq",
      "formulario",
      "localizacao",
      "horarios",
      "rodape",
    ],
    produtos: [
      {
        id: "p1",
        nome: "Chalé Serra (2 pessoas)",
        descricao: "Lareira, varanda com rede e vista para o vale. Café da manhã incluso.",
        preco: 590,
        categoria: "Acomodações",
        variacoes: ["Meia semana", "Fim de semana"],
        imagem: imagens.pousada,
        disponivel: true,
        destaque: true,
      },
      {
        id: "p2",
        nome: "Suíte Jardim (2 a 3 pessoas)",
        descricao: "Banheira de imersão, acesso direto ao jardim e frigobar abastecido.",
        preco: 720,
        precoPromocional: 640,
        categoria: "Acomodações",
        variacoes: ["Casal", "Casal + 1"],
        disponivel: true,
        destaque: true,
      },
      {
        id: "p3",
        nome: "Chalé Família (até 5 pessoas)",
        descricao: "Dois quartos, cozinha equipada e área externa com churrasqueira.",
        preco: 980,
        categoria: "Acomodações",
        variacoes: ["4 pessoas", "5 pessoas"],
        disponivel: true,
        destaque: false,
      },
    ],
    servicos: [
      {
        id: "s1",
        nome: "Café da manhã colonial",
        descricao: "Servido das 8h às 10h30 com pães e geleias da casa.",
        duracao: "Diário",
        preco: 0,
      },
      {
        id: "s2",
        nome: "Piscina aquecida e sauna",
        descricao: "Aberta para hóspedes das 8h às 21h.",
        duracao: "Diário",
        preco: 0,
      },
      {
        id: "s3",
        nome: "Passeios e trilhas",
        descricao: "Roteiros guiados pela região com agendamento na recepção.",
        duracao: "Sob consulta",
        preco: 0,
      },
      {
        id: "s4",
        nome: "Estacionamento e pet friendly",
        descricao: "Vaga coberta por chalé e aceitamos pets de pequeno porte.",
        duracao: "Diário",
        preco: 0,
      },
    ],
    galeria: [
      { id: "g1", url: imagens.pousada, titulo: "Área externa e piscina" },
      { id: "g2", url: imagens.eventos, titulo: "Sala de estar com lareira" },
      { id: "g3", url: imagens.restaurante, titulo: "Café da manhã da casa" },
    ],
    depoimentos: [
      {
        id: "d1",
        nome: "Juliana e Pedro (demonstração)",
        nota: 5,
        comentario: "Chalé aquecido, café maravilhoso e vista incrível. Voltaremos no inverno.",
        data: "2026-06-15",
        destaque: true,
      },
      {
        id: "d2",
        nome: "Família Nogueira (demonstração)",
        nota: 5,
        comentario: "Espaço ótimo para crianças e equipe muito atenciosa com os horários.",
        data: "2026-05-02",
        destaque: false,
      },
    ],
    faq: [
      {
        id: "f1",
        pergunta: "Qual o horário de check-in e check-out?",
        resposta:
          "Check-in a partir das 15h e check-out até as 12h. Horários diferentes sob consulta.",
      },
      {
        id: "f2",
        pergunta: "O café da manhã está incluso?",
        resposta: "Sim, em todas as acomodações, servido das 8h às 10h30.",
      },
      {
        id: "f3",
        pergunta: "Aceitam pets?",
        resposta: "Aceitamos pets de pequeno porte no Chalé Família, avisando na reserva.",
      },
    ],
    formulario: {
      tipo: "reserva",
      titulo: "Consulte disponibilidade",
      campos: [
        { id: "c1", rotulo: "Nome", tipo: "texto", obrigatorio: true },
        { id: "c2", rotulo: "WhatsApp", tipo: "telefone", obrigatorio: true },
        { id: "c3", rotulo: "Data de entrada", tipo: "data", obrigatorio: true },
        { id: "c4", rotulo: "Data de saída", tipo: "data", obrigatorio: true },
        { id: "c5", rotulo: "Quantidade de hóspedes", tipo: "texto", obrigatorio: true },
        { id: "c6", rotulo: "Acomodação de interesse", tipo: "texto", obrigatorio: false },
      ],
    },
  },
};
