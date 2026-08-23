import { imagens } from "./images";
import type { ConteudoDemo } from "./demo-novos";

/**
 * Conteúdo demonstrativo dos 12 modelos premium adicionados na rodada 4.
 * Apenas dados de exemplo para demonstrações e ponto de partida de novos
 * mini-sites — nunca sobrescreve dados reais de clientes.
 */

const secoesServico: ConteudoDemo["secoes"] = [
  "apresentacao",
  "servicos",
  "depoimentos",
  "galeria",
  "faq",
  "formulario",
  "localizacao",
  "horarios",
  "rodape",
];

const secoesAgenda: ConteudoDemo["secoes"] = [
  "apresentacao",
  "servicos",
  "equipe",
  "agenda",
  "depoimentos",
  "galeria",
  "faq",
  "formulario",
  "localizacao",
  "horarios",
  "rodape",
];

const secoesCatalogo: ConteudoDemo["secoes"] = [
  "apresentacao",
  "produtos",
  "promocao",
  "galeria",
  "depoimentos",
  "cupom",
  "formulario",
  "localizacao",
  "horarios",
  "rodape",
];

export const conteudoModelosPremium: Record<string, ConteudoDemo> = {
  "nutricionista-clinico": {
    nome: "Clínica Viva Nutrição (demonstração)",
    descricao:
      "Acompanhamento nutricional individual, avaliação de composição corporal e planos alimentares realistas.",
    cidade: "Curitiba",
    estado: "PR",
    whatsapp: "5541998220110",
    instagram: "vivanutricao.demo",
    endereco: "Av. Sete de Setembro, 2100 - Batel, Curitiba - PR",
    cta: "Agendar consulta",
    logoFormato: "redondo",
    secoes: secoesAgenda,
    servicos: [
      {
        id: "s1",
        nome: "Primeira consulta",
        descricao: "Anamnese completa, bioimpedância e plano alimentar personalizado.",
        duracao: "1h",
        preco: 280,
        profissional: "Dra. Marina Alves",
        imagem: imagens.nutricao,
      },
      {
        id: "s2",
        nome: "Retorno mensal",
        descricao: "Reavaliação, ajustes do plano e acompanhamento de metas.",
        duracao: "40 min",
        preco: 180,
        profissional: "Dra. Marina Alves",
      },
      {
        id: "s3",
        nome: "Nutrição esportiva",
        descricao: "Estratégia alimentar para performance, hipertrofia e recuperação.",
        duracao: "1h",
        preco: 320,
        profissional: "Dr. Rafael Prado",
      },
    ],
    equipe: [
      {
        id: "e1",
        nome: "Dra. Marina Alves",
        funcao: "Nutricionista clínica · CRN 12345",
        foto: imagens.nutricao,
      },
      { id: "e2", nome: "Dr. Rafael Prado", funcao: "Nutrição esportiva · CRN 54321" },
    ],
    faq: [
      {
        id: "f1",
        pergunta: "Atendem por videochamada?",
        resposta: "Sim, o atendimento online tem o mesmo formato e valor da consulta presencial.",
      },
      {
        id: "f2",
        pergunta: "O plano alimentar é entregue no mesmo dia?",
        resposta: "Enviamos em até 48h úteis pelo WhatsApp, com orientações e lista de compras.",
      },
    ],
  },

  "psicologia-terapia": {
    nome: "Espaço Sereno Psicologia (demonstração)",
    descricao:
      "Terapia individual, de casal e para adolescentes em um ambiente acolhedor, presencial ou online.",
    cidade: "Belo Horizonte",
    estado: "MG",
    whatsapp: "5531997330220",
    instagram: "espacosereno.demo",
    endereco: "Rua Pernambuco, 1180 - Savassi, Belo Horizonte - MG",
    cta: "Agendar sessão",
    logoFormato: "redondo",
    secoes: secoesAgenda,
    servicos: [
      {
        id: "s1",
        nome: "Terapia individual",
        descricao: "Sessões semanais com abordagem cognitivo-comportamental.",
        duracao: "50 min",
        preco: 200,
        profissional: "Ana Beatriz Lima",
        imagem: imagens.psicologia,
      },
      {
        id: "s2",
        nome: "Terapia de casal",
        descricao: "Mediação de conflitos e reconstrução da comunicação.",
        duracao: "1h10",
        preco: 300,
        profissional: "Ana Beatriz Lima",
      },
      {
        id: "s3",
        nome: "Atendimento online",
        descricao: "Mesma estrutura da sessão presencial, por vídeo seguro.",
        duracao: "50 min",
        preco: 180,
      },
    ],
    equipe: [
      { id: "e1", nome: "Ana Beatriz Lima", funcao: "Psicóloga · CRP 04/12345", foto: imagens.psicologia },
      { id: "e2", nome: "Thiago Menezes", funcao: "Psicólogo infantojuvenil · CRP 04/67890" },
    ],
    faq: [
      {
        id: "f1",
        pergunta: "As sessões são sigilosas?",
        resposta: "Sim. Todo o conteúdo é protegido pelo código de ética profissional.",
      },
      {
        id: "f2",
        pergunta: "Com que frequência devo vir?",
        resposta: "O padrão é semanal, mas definimos juntos na primeira sessão.",
      },
    ],
  },

  "estetica-spa": {
    nome: "Lumière Estética & Spa (demonstração)",
    descricao:
      "Protocolos faciais e corporais, massagens relaxantes e day spa em ambiente pensado para descanso.",
    cidade: "São Paulo",
    estado: "SP",
    whatsapp: "5511996440330",
    instagram: "lumiere.spa.demo",
    endereco: "Rua Oscar Freire, 620 - Jardins, São Paulo - SP",
    cta: "Reservar horário",
    logoFormato: "redondo",
    secoes: secoesAgenda,
    servicos: [
      {
        id: "s1",
        nome: "Limpeza de pele profunda",
        descricao: "Extração, alta frequência e máscara calmante.",
        duracao: "1h20",
        preco: 210,
        imagem: imagens.spa,
      },
      {
        id: "s2",
        nome: "Massagem relaxante",
        descricao: "Óleos essenciais e pressão ajustada ao seu nível de tensão.",
        duracao: "1h",
        preco: 180,
      },
      {
        id: "s3",
        nome: "Day spa casal",
        descricao: "Massagem, esfoliação e ritual de chá para duas pessoas.",
        duracao: "3h",
        preco: 690,
      },
    ],
    depoimentos: [
      {
        id: "d1",
        nome: "Renata Souza",
        nota: 5,
        comentario: "Saí outra pessoa. Ambiente impecável e atendimento atencioso.",
        data: "2026-07-02",
        destaque: true,
      },
    ],
    faq: [
      {
        id: "f1",
        pergunta: "Preciso remarcar com antecedência?",
        resposta: "Pedimos aviso de 24h para reagendar sem custo.",
      },
    ],
  },

  "nail-designer": {
    nome: "Studio Glow Nails (demonstração)",
    descricao:
      "Alongamento em fibra, blindagem e nail art autoral com agendamento rápido pelo WhatsApp.",
    cidade: "Goiânia",
    estado: "GO",
    whatsapp: "5562995110440",
    instagram: "glownails.demo",
    endereco: "Rua T-55, 340 - Setor Bueno, Goiânia - GO",
    cta: "Agendar manicure",
    logoFormato: "redondo",
    secoes: secoesAgenda,
    servicos: [
      {
        id: "s1",
        nome: "Alongamento em fibra de vidro",
        descricao: "Modelagem, esmaltação em gel e finalização.",
        duracao: "2h30",
        preco: 220,
        imagem: imagens.nail,
      },
      { id: "s2", nome: "Manutenção", descricao: "A cada 21 dias.", duracao: "1h40", preco: 130 },
      { id: "s3", nome: "Esmaltação em gel", descricao: "Nas unhas naturais.", duracao: "1h", preco: 90 },
      { id: "s4", nome: "Nail art autoral", descricao: "Por unha decorada.", duracao: "15 min", preco: 15 },
    ],
    galeria: [
      { id: "g1", url: imagens.nail, titulo: "Nail art francesinha" },
      { id: "g2", url: imagens.spa, titulo: "Ambiente do studio" },
    ],
    faq: [
      {
        id: "f1",
        pergunta: "Posso levar foto de referência?",
        resposta: "Sim! Mande no WhatsApp antes do horário para separarmos os materiais.",
      },
    ],
  },

  "escola-idiomas": {
    nome: "Fluency Lab Idiomas (demonstração)",
    descricao:
      "Inglês e espanhol em turmas de até 6 alunos, com nivelamento gratuito e aulas de conversação.",
    cidade: "Porto Alegre",
    estado: "RS",
    whatsapp: "5551994220550",
    instagram: "fluencylab.demo",
    endereco: "Av. Independência, 780 - Moinhos de Vento, Porto Alegre - RS",
    cta: "Fazer nivelamento grátis",
    secoes: secoesAgenda,
    servicos: [
      {
        id: "s1",
        nome: "Inglês geral",
        descricao: "Do básico ao avançado, 2 encontros semanais.",
        duracao: "1h30",
        preco: 0,
        imagem: imagens.idiomas,
      },
      { id: "s2", nome: "Conversação", descricao: "Turmas temáticas semanais.", duracao: "1h", preco: 0 },
      { id: "s3", nome: "Inglês para negócios", descricao: "Reuniões, e-mails e apresentações.", duracao: "1h30", preco: 0 },
    ],
    produtos: [
      {
        id: "p1",
        nome: "Plano trimestral",
        descricao: "2 aulas por semana + material digital.",
        preco: 1170,
        categoria: "Planos",
        variacoes: ["Inglês", "Espanhol"],
        disponivel: true,
        destaque: true,
        imagem: imagens.idiomas,
      },
      {
        id: "p2",
        nome: "Aula particular",
        descricao: "Pacote com 8 aulas individuais.",
        preco: 960,
        precoPromocional: 880,
        categoria: "Planos",
        variacoes: [],
        disponivel: true,
        destaque: false,
      },
    ],
    faq: [
      {
        id: "f1",
        pergunta: "Como sei meu nível?",
        resposta: "O teste de nivelamento é gratuito e leva cerca de 30 minutos.",
      },
    ],
  },

  autoescola: {
    nome: "CFC Direção Segura (demonstração)",
    descricao:
      "Primeira habilitação, adição de categoria e aulas extras com instrutores credenciados.",
    cidade: "Campo Grande",
    estado: "MS",
    whatsapp: "5567993110660",
    instagram: "direcaosegura.demo",
    endereco: "Av. Afonso Pena, 1450 - Centro, Campo Grande - MS",
    cta: "Simular matrícula",
    secoes: secoesServico,
    servicos: [
      {
        id: "s1",
        nome: "Primeira habilitação A/B",
        descricao: "Curso teórico, exames e aulas práticas incluídas.",
        duracao: "Processo completo",
        preco: 0,
        imagem: imagens.autoescola,
      },
      { id: "s2", nome: "Adição de categoria", descricao: "Para quem já tem CNH.", duracao: "Consulte", preco: 0 },
      { id: "s3", nome: "Aula avulsa de direção", descricao: "Para recuperar confiança ao volante.", duracao: "50 min", preco: 120 },
    ],
    faq: [
      {
        id: "f1",
        pergunta: "Posso parcelar?",
        resposta: "Sim, parcelamos no cartão ou em boletos mensais durante o processo.",
      },
      {
        id: "f2",
        pergunta: "Quanto tempo leva?",
        resposta: "Em média de 60 a 90 dias, conforme a agenda do Detran.",
      },
    ],
  },

  contabilidade: {
    nome: "Prisma Contabilidade (demonstração)",
    descricao:
      "Abertura de empresa, contabilidade mensal e planejamento tributário para MEIs e pequenas empresas.",
    cidade: "Ribeirão Preto",
    estado: "SP",
    whatsapp: "5516992440770",
    instagram: "prismacontabil.demo",
    endereco: "Av. Presidente Vargas, 900 - Jardim América, Ribeirão Preto - SP",
    cta: "Falar com um contador",
    logoFormato: "quadrado",
    secoes: secoesServico,
    servicos: [
      {
        id: "s1",
        nome: "Abertura de empresa",
        descricao: "CNPJ, alvará e enquadramento tributário sem burocracia.",
        duracao: "5 a 10 dias",
        preco: 0,
        imagem: imagens.contabilidade,
      },
      { id: "s2", nome: "Contabilidade mensal", descricao: "Guias, folha e obrigações em dia.", duracao: "Mensal", preco: 0 },
      { id: "s3", nome: "Planejamento tributário", descricao: "Análise do melhor regime para reduzir impostos.", duracao: "Sob análise", preco: 0 },
      { id: "s4", nome: "Imposto de renda PF", descricao: "Declaração completa com revisão.", duracao: "Anual", preco: 0 },
    ],
    formulario: {
      tipo: "orcamento",
      titulo: "Peça uma proposta",
      campos: [
        { id: "c1", rotulo: "Nome", tipo: "texto", obrigatorio: true },
        { id: "c2", rotulo: "WhatsApp", tipo: "telefone", obrigatorio: true },
        { id: "c3", rotulo: "Tipo de empresa", tipo: "texto", obrigatorio: false },
        { id: "c4", rotulo: "Como podemos ajudar?", tipo: "textarea", obrigatorio: false },
      ],
    },
    faq: [
      {
        id: "f1",
        pergunta: "Atendem em todo o Brasil?",
        resposta: "Sim, o atendimento é digital e os documentos são assinados eletronicamente.",
      },
    ],
  },

  "agencia-marketing": {
    nome: "Órbita Marketing (demonstração)",
    descricao:
      "Gestão de tráfego pago, social media e criação de conteúdo com relatórios mensais claros.",
    cidade: "São Paulo",
    estado: "SP",
    whatsapp: "5511991550880",
    instagram: "orbita.demo",
    endereco: "Rua Fidalga, 220 - Vila Madalena, São Paulo - SP",
    cta: "Solicitar diagnóstico",
    logoFormato: "quadrado",
    secoes: secoesServico,
    servicos: [
      {
        id: "s1",
        nome: "Gestão de tráfego pago",
        descricao: "Meta Ads e Google Ads com otimização semanal.",
        duracao: "Mensal",
        preco: 0,
        imagem: imagens.agencia,
      },
      { id: "s2", nome: "Social media", descricao: "Planejamento, design e publicação.", duracao: "Mensal", preco: 0 },
      { id: "s3", nome: "Identidade visual", descricao: "Logo, paleta e manual de marca.", duracao: "3 semanas", preco: 0 },
    ],
    depoimentos: [
      {
        id: "d1",
        nome: "Carlos Menezes",
        nota: 5,
        comentario: "Em três meses o custo por lead caiu pela metade.",
        data: "2026-06-11",
        destaque: true,
      },
    ],
    faq: [
      {
        id: "f1",
        pergunta: "Existe fidelidade?",
        resposta: "O contrato mínimo é de 3 meses, tempo necessário para maturar as campanhas.",
      },
    ],
  },

  floricultura: {
    nome: "Casa Flora (demonstração)",
    descricao:
      "Buquês, arranjos e plantas com entrega no mesmo dia e cartão personalizado.",
    cidade: "Niterói",
    estado: "RJ",
    whatsapp: "5521990660990",
    instagram: "casaflora.demo",
    endereco: "Rua Moreira César, 210 - Icaraí, Niterói - RJ",
    cta: "Pedir pelo WhatsApp",
    secoes: secoesCatalogo,
    produtos: [
      {
        id: "p1",
        nome: "Buquê de rosas colombianas",
        descricao: "12 rosas com folhagem e papel kraft.",
        preco: 189,
        categoria: "Buquês",
        variacoes: ["12 rosas", "24 rosas"],
        imagem: imagens.floricultura,
        disponivel: true,
        destaque: true,
      },
      {
        id: "p2",
        nome: "Arranjo do dia",
        descricao: "Flores da estação em vaso de vidro.",
        preco: 149,
        precoPromocional: 129,
        categoria: "Arranjos",
        variacoes: ["Pequeno", "Médio", "Grande"],
        disponivel: true,
        destaque: true,
      },
      {
        id: "p3",
        nome: "Orquídea phalaenopsis",
        descricao: "Cachepô de cerâmica e cartão incluso.",
        preco: 219,
        categoria: "Plantas",
        variacoes: [],
        disponivel: true,
        destaque: false,
      },
      {
        id: "p4",
        nome: "Cesta café da manhã",
        descricao: "Flores, pães, frutas e chocolates.",
        preco: 265,
        categoria: "Presentes",
        variacoes: ["Para um", "Para dois"],
        disponivel: true,
        destaque: false,
      },
    ],
    cupons: [
      {
        id: "cp1",
        titulo: "Frete grátis em Icaraí",
        descricao: "Pedidos acima de R$ 150 feitos até as 15h.",
        codigo: "FLORA150",
        validade: "2026-12-31",
        ativo: true,
      },
    ],
    faq: [
      {
        id: "f1",
        pergunta: "Entregam no mesmo dia?",
        resposta: "Sim, para pedidos confirmados até as 15h na região de Niterói.",
      },
    ],
  },

  "assistencia-tecnica": {
    nome: "TechFix Assistência (demonstração)",
    descricao:
      "Conserto de celulares e notebooks com diagnóstico gratuito e 90 dias de garantia.",
    cidade: "Fortaleza",
    estado: "CE",
    whatsapp: "5585994770110",
    instagram: "techfix.demo",
    endereco: "Av. Dom Luís, 500 - Aldeota, Fortaleza - CE",
    cta: "Pedir orçamento",
    logoFormato: "quadrado",
    secoes: secoesServico,
    servicos: [
      {
        id: "s1",
        nome: "Troca de tela",
        descricao: "Peças originais ou compatíveis, feito em até 2h.",
        duracao: "2h",
        preco: 0,
        imagem: imagens.assistencia,
      },
      { id: "s2", nome: "Troca de bateria", descricao: "Com teste de saúde antes e depois.", duracao: "1h", preco: 0 },
      { id: "s3", nome: "Reparo de placa", descricao: "Microssoldagem para danos por líquido e queda.", duracao: "2 a 5 dias", preco: 0 },
      { id: "s4", nome: "Limpeza de notebook", descricao: "Troca de pasta térmica e higienização.", duracao: "3h", preco: 149 },
    ],
    faq: [
      {
        id: "f1",
        pergunta: "O orçamento é cobrado?",
        resposta: "Não. O diagnóstico é gratuito e você aprova antes de qualquer serviço.",
      },
      {
        id: "f2",
        pergunta: "Qual a garantia?",
        resposta: "90 dias para peça e mão de obra, conforme o Código de Defesa do Consumidor.",
      },
    ],
  },

  "estetica-automotiva": {
    nome: "Black Shine Detail (demonstração)",
    descricao:
      "Polimento técnico, vitrificação e higienização interna com acabamento de concessionária.",
    cidade: "Joinville",
    estado: "SC",
    whatsapp: "5547993880220",
    instagram: "blackshine.demo",
    endereco: "Rua XV de Novembro, 1320 - América, Joinville - SC",
    cta: "Agendar serviço",
    logoFormato: "quadrado",
    secoes: secoesAgenda,
    servicos: [
      {
        id: "s1",
        nome: "Polimento técnico",
        descricao: "Correção de riscos e restauração do brilho da pintura.",
        duracao: "6h",
        preco: 690,
        imagem: imagens.automotiva,
      },
      { id: "s2", nome: "Vitrificação de pintura", descricao: "Proteção cerâmica com durabilidade de 12 meses.", duracao: "1 dia", preco: 1490 },
      { id: "s3", nome: "Higienização interna", descricao: "Bancos, carpetes, teto e ar-condicionado.", duracao: "4h", preco: 450 },
      { id: "s4", nome: "Lavagem detalhada", descricao: "Método dos dois baldes e cera de carnaúba.", duracao: "1h30", preco: 160 },
    ],
    depoimentos: [
      {
        id: "d1",
        nome: "Eduardo Faria",
        nota: 5,
        comentario: "O carro voltou parecendo zero. Serviço caprichado do começo ao fim.",
        data: "2026-07-08",
        destaque: true,
      },
    ],
    faq: [
      {
        id: "f1",
        pergunta: "Precisa deixar o carro?",
        resposta: "Depende do serviço: lavagem é no mesmo horário, vitrificação exige um dia.",
      },
    ],
  },

  "turismo-passeios": {
    nome: "Maré Alta Turismo (demonstração)",
    descricao:
      "Passeios de barco, trilhas guiadas e transfers com guias credenciados e saídas diárias.",
    cidade: "Arraial do Cabo",
    estado: "RJ",
    whatsapp: "5522991220330",
    instagram: "marealta.demo",
    endereco: "Praça da Bandeira, 45 - Centro, Arraial do Cabo - RJ",
    cta: "Reservar passeio",
    secoes: secoesCatalogo,
    produtos: [
      {
        id: "p1",
        nome: "Passeio de barco clássico",
        descricao: "4 paradas para banho, com equipamento de snorkel.",
        preco: 120,
        categoria: "Passeios",
        variacoes: ["Manhã", "Tarde"],
        imagem: imagens.turismo,
        disponivel: true,
        destaque: true,
      },
      {
        id: "p2",
        nome: "Trilha guiada Pontal do Atalaia",
        descricao: "Nascer do sol com guia local e fotos inclusas.",
        preco: 90,
        categoria: "Passeios",
        variacoes: [],
        disponivel: true,
        destaque: true,
      },
      {
        id: "p3",
        nome: "Transfer aeroporto",
        descricao: "Rio de Janeiro ↔ Arraial do Cabo, carro executivo.",
        preco: 450,
        categoria: "Transfers",
        variacoes: ["Até 3 pessoas", "Até 6 pessoas"],
        disponivel: true,
        destaque: false,
      },
    ],
    faq: [
      {
        id: "f1",
        pergunta: "E se o passeio for cancelado pelo tempo?",
        resposta: "Remarcamos sem custo ou devolvemos o valor integral.",
      },
      {
        id: "f2",
        pergunta: "Crianças pagam?",
        resposta: "Crianças até 5 anos não pagam; de 6 a 10 anos têm 50% de desconto.",
      },
    ],
  },
};
