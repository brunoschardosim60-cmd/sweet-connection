import { imagens } from "./images";
import type { Site } from "./types";

/**
 * Conteúdo demonstrativo complementar dos modelos mais antigos: CTA, depoimentos,
 * formulário, cupom, FAQ e galeria próprios de cada segmento. Usado apenas nas
 * demonstrações — não altera dados reais de clientes.
 */
export interface ExtrasModelo {
  cta?: string;
  depoimentos?: Site["depoimentos"];
  formulario?: Site["formulario"];
  cupons?: Site["cupons"];
  faq?: Site["faq"];
  galeria?: Site["galeria"];
}

type CampoTipo = Site["formulario"]["campos"][number]["tipo"];

const depo = (
  itens: { nome: string; nota: number; comentario: string }[],
): Site["depoimentos"] =>
  itens.map((d, i) => ({
    id: `d${i + 1}`,
    nome: `${d.nome} (demonstração)`,
    nota: d.nota,
    comentario: d.comentario,
    data: "2026-05-1" + (i + 1),
    destaque: i === 0,
  }));

const faq = (itens: [string, string][]): Site["faq"] =>
  itens.map(([pergunta, resposta], i) => ({ id: `f${i + 1}`, pergunta, resposta }));

const galeria = (itens: [string, string][]): Site["galeria"] =>
  itens.map(([url, titulo], i) => ({ id: `g${i + 1}`, url, titulo }));

const cupom = (titulo: string, descricao: string, codigo: string): Site["cupons"] => [
  { id: "cp1", titulo, descricao, codigo, validade: "2026-12-31", ativo: true },
];

const form = (
  tipo: Site["formulario"]["tipo"],
  titulo: string,
  campos: [string, CampoTipo, boolean][],
): Site["formulario"] => ({
  tipo,
  titulo,
  campos: campos.map(([rotulo, t, obrigatorio], i) => ({
    id: `c${i + 1}`,
    rotulo,
    tipo: t,
    obrigatorio,
  })),
});

const NOME: [string, CampoTipo, boolean] = ["Nome", "texto", true];
const ZAP: [string, CampoTipo, boolean] = ["WhatsApp", "telefone", true];
const DATA: [string, CampoTipo, boolean] = ["Data desejada", "data", true];

export const extrasPorModelo: Record<string, ExtrasModelo> = {
  "restaurante-moderno": {
    cta: "Reservar mesa",
    depoimentos: depo([
      {
        nome: "Marina Duarte",
        nota: 5,
        comentario: "Massa fresca impecável e atendimento atencioso. Voltamos toda semana.",
      },
      {
        nome: "Rogério Pinto",
        nota: 5,
        comentario: "Reservei pelo site em um minuto e a mesa estava pronta na chegada.",
      },
    ]),
    formulario: form("reserva", "Reserve sua mesa", [
      NOME,
      ZAP,
      DATA,
      ["Número de pessoas", "texto", true],
      ["Observações", "textarea", false],
    ]),
    cupons: cupom(
      "Sobremesa cortesia",
      "Válido para reservas feitas pelo site, de terça a quinta.",
      "CANTINA-DOCE",
    ),
    faq: faq([
      ["Precisa reservar?", "Recomendamos reservar nos fins de semana; nos demais dias há espera."],
      ["Tem opções sem glúten?", "Sim, temos massas sem glúten mediante aviso na reserva."],
    ]),
    galeria: galeria([
      [imagens.restaurante, "Salão principal"],
      [imagens.pizzaria, "Forno a lenha"],
      [imagens.doceria, "Sobremesas da casa"],
    ]),
  },

  "hamburgueria-urbana": {
    cta: "Pedir pelo WhatsApp",
    depoimentos: depo([
      {
        nome: "Diego Farias",
        nota: 5,
        comentario: "Smash na medida certa e entrega em 25 minutos. Melhor do bairro.",
      },
      {
        nome: "Paula Mendes",
        nota: 4,
        comentario: "Batata rústica muito boa e o combo tem ótimo custo-benefício.",
      },
    ]),
    formulario: form("contato", "Faça seu pedido", [
      NOME,
      ZAP,
      ["Endereço de entrega", "texto", true],
      ["Itens do pedido", "textarea", true],
    ]),
    cupons: cupom(
      "Combo com refri grátis",
      "Peça dois burgers pelo WhatsApp e leve a bebida por nossa conta.",
      "BRASA-COMBO",
    ),
    faq: faq([
      ["Qual o horário de entrega?", "Entregamos das 18h às 23h, todos os dias."],
      ["Qual a taxa de entrega?", "Bairros próximos: R$ 6. Demais regiões conforme distância."],
    ]),
    galeria: galeria([
      [imagens.hamburgueria, "Chapa na brasa"],
      [imagens.restaurante, "Salão da casa"],
      [imagens.pizzaria, "Combos para dividir"],
    ]),
  },

  "loja-roupas": {
    cta: "Falar com a loja",
    depoimentos: depo([
      {
        nome: "Camila Rocha",
        nota: 5,
        comentario: "Peças com caimento ótimo e atendimento por WhatsApp super rápido.",
      },
      {
        nome: "Beatriz Lopes",
        nota: 5,
        comentario: "Provei na loja, escolhi outra numeração e recebi em casa no mesmo dia.",
      },
    ]),
    formulario: form("contato", "Consulte disponibilidade", [
      NOME,
      ZAP,
      ["Peça desejada", "texto", true],
      ["Tamanho", "texto", false],
    ]),
    cupons: cupom(
      "10% na primeira compra",
      "Apresente o código no provador ou no WhatsApp da loja.",
      "ESTILO10",
    ),
    faq: faq([
      ["Fazem troca?", "Sim, em até 30 dias com a etiqueta original."],
      ["Enviam para outras cidades?", "Enviamos para todo o Brasil pelos Correios."],
    ]),
    galeria: galeria([
      [imagens.moda, "Coleção da estação"],
      [imagens.cosmeticos, "Acessórios"],
      [imagens.salao, "Ambiente da loja"],
    ]),
  },

  cosmeticos: {
    cta: "Comprar pelo WhatsApp",
    depoimentos: depo([
      {
        nome: "Tainá Ribeiro",
        nota: 5,
        comentario: "Pele mudou em três semanas com a rotina que indicaram.",
      },
      {
        nome: "Elisa Prado",
        nota: 5,
        comentario: "Kits bem embalados e consultoria gratuita antes da compra.",
      },
    ]),
    formulario: form("contato", "Monte sua rotina de skincare", [
      NOME,
      ZAP,
      ["Tipo de pele", "texto", true],
      ["Sua principal queixa", "textarea", false],
    ]),
    cupons: cupom(
      "Frete grátis acima de R$ 199",
      "Válido para pedidos feitos pelo WhatsApp da loja.",
      "GLOW199",
    ),
    faq: faq([
      ["Os produtos são testados em animais?", "Não. Toda a linha é cruelty free."],
      ["Fazem consultoria?", "Sim, avaliação gratuita por WhatsApp antes de indicar a rotina."],
    ]),
    galeria: galeria([
      [imagens.cosmeticos, "Linha facial"],
      [imagens.salao, "Ritual de cuidado"],
      [imagens.moda, "Kits para presente"],
    ]),
  },

  "barbearia-premium": {
    cta: "Agendar horário",
    depoimentos: depo([
      {
        nome: "Vinícius Alves",
        nota: 5,
        comentario: "Corte impecável e barba feita na navalha. Ambiente muito bem cuidado.",
      },
      {
        nome: "Rafael Nunes",
        nota: 5,
        comentario: "Agendei pelo site e fui atendido no horário exato.",
      },
    ]),
    formulario: form("agendamento", "Agende seu horário", [
      NOME,
      ZAP,
      DATA,
      ["Serviço desejado", "texto", true],
      ["Barbeiro de preferência", "texto", false],
    ]),
    cupons: cupom(
      "Corte + barba com 15%",
      "Desconto para o primeiro agendamento feito pelo site.",
      "NAVALHA15",
    ),
    faq: faq([
      ["Atendem sem agendamento?", "Sim, por ordem de chegada, conforme disponibilidade."],
      ["Aceitam cartão?", "Aceitamos cartões, Pix e dinheiro."],
    ]),
    galeria: galeria([
      [imagens.barbearia, "Cadeira clássica"],
      [imagens.salao, "Ambiente"],
      [imagens.cosmeticos, "Produtos de barba"],
    ]),
  },

  "salao-beleza": {
    cta: "Agendar atendimento",
    depoimentos: depo([
      {
        nome: "Juliana Castro",
        nota: 5,
        comentario: "Coloração perfeita e cabelo saudável mesmo depois da mechas.",
      },
      {
        nome: "Fernanda Dias",
        nota: 5,
        comentario: "Equipe atenciosa, salão limpo e horário sempre respeitado.",
      },
    ]),
    formulario: form("agendamento", "Agende seu atendimento", [
      NOME,
      ZAP,
      DATA,
      ["Serviço desejado", "texto", true],
      ["Profissional de preferência", "texto", false],
    ]),
    cupons: cupom(
      "Hidratação cortesia",
      "Na primeira coloração ou mechas agendada pelo site.",
      "BRILHO-NEW",
    ),
    faq: faq([
      ["Preciso agendar?", "Sim, trabalhamos com hora marcada para evitar espera."],
      ["Quanto tempo dura uma mechas?", "Entre 3 e 4 horas, dependendo do comprimento."],
    ]),
    galeria: galeria([
      [imagens.salao, "Ambiente do salão"],
      [imagens.cosmeticos, "Linha de tratamento"],
      [imagens.barbearia, "Finalização"],
    ]),
  },

  clinica: {
    cta: "Agendar consulta",
    depoimentos: depo([
      {
        nome: "Sandra Meireles",
        nota: 5,
        comentario: "Consulta sem atraso e explicação muito clara sobre o tratamento.",
      },
      {
        nome: "Otávio Lemos",
        nota: 5,
        comentario: "Recepção organizada e retorno agendado ali mesmo.",
      },
    ]),
    formulario: form("agendamento", "Solicite um agendamento", [
      NOME,
      ZAP,
      DATA,
      ["Especialidade", "texto", true],
      ["Convênio (se houver)", "texto", false],
    ]),
    cupons: cupom(
      "Avaliação inicial com 20%",
      "Para o primeiro atendimento particular agendado pelo site.",
      "CUIDAR20",
    ),
    galeria: galeria([
      [imagens.clinica, "Recepção"],
      [imagens.odontologia, "Consultório"],
      [imagens.servicos, "Equipe em atendimento"],
    ]),
  },

  "personal-trainer": {
    cta: "Agendar avaliação",
    depoimentos: depo([
      {
        nome: "Lucas Petrini",
        nota: 5,
        comentario: "Perdi 9 kg em quatro meses com treino ajustado à minha rotina.",
      },
      {
        nome: "Aline Moura",
        nota: 5,
        comentario: "Acompanhamento por app e correção de execução em toda sessão.",
      },
    ]),
    formulario: form("contato", "Solicite sua avaliação física", [
      NOME,
      ZAP,
      ["Objetivo principal", "texto", true],
      ["Já treina atualmente?", "texto", false],
      ["Restrições ou lesões", "textarea", false],
    ]),
    cupons: cupom(
      "Primeira sessão gratuita",
      "Avaliação física e aula experimental sem custo.",
      "TREINO-ZERO",
    ),
    faq: faq([
      ["Atende em domicílio?", "Sim, em casa, no condomínio ou na academia parceira."],
      ["Como é o acompanhamento?", "Treino no app, ajustes quinzenais e suporte por WhatsApp."],
    ]),
    galeria: galeria([
      [imagens.fitness, "Treino funcional"],
      [imagens.servicos, "Avaliação física"],
      [imagens.clinica, "Acompanhamento"],
    ]),
  },

  fotografo: {
    cta: "Pedir orçamento",
    depoimentos: depo([
      {
        nome: "Marcos e Letícia",
        nota: 5,
        comentario: "Registrou nosso casamento sem interferir na festa. Álbum lindo.",
      },
      {
        nome: "Priscila Amaral",
        nota: 5,
        comentario: "Ensaio leve, direção de pose excelente e entrega antes do prazo.",
      },
    ]),
    formulario: form("orcamento", "Peça seu orçamento", [
      NOME,
      ZAP,
      ["Tipo de ensaio ou evento", "texto", true],
      DATA,
      ["Local", "texto", false],
    ]),
    cupons: cupom(
      "10 fotos extras",
      "Para ensaios contratados com 30 dias de antecedência.",
      "LUZ-EXTRA",
    ),
    faq: faq([
      ["Em quanto tempo recebo as fotos?", "Ensaios em 10 dias e eventos em até 30 dias."],
      ["As fotos são tratadas?", "Sim, todas passam por tratamento de cor e luz."],
    ]),
    galeria: galeria([
      [imagens.fotografo, "Ensaio externo"],
      [imagens.eventos, "Cobertura de evento"],
      [imagens.moda, "Book editorial"],
    ]),
  },

  corretor: {
    cta: "Agendar visita",
    depoimentos: depo([
      {
        nome: "Henrique Sales",
        nota: 5,
        comentario: "Encontrou o apartamento certo em duas semanas e cuidou da documentação.",
      },
      {
        nome: "Cláudia Bastos",
        nota: 5,
        comentario: "Transparente sobre valores e condições de financiamento.",
      },
    ]),
    formulario: form("contato", "Agende uma visita", [
      NOME,
      ZAP,
      ["Imóvel de interesse", "texto", true],
      DATA,
      ["Pretende financiar?", "texto", false],
    ]),
    cupons: cupom(
      "Assessoria de financiamento gratuita",
      "Simulação em três bancos para quem agenda visita pelo site.",
      "LAR-SIMULA",
    ),
    faq: faq([
      ["Cobram taxa para visitar?", "Não. As visitas são gratuitas e sem compromisso."],
      ["Ajudam na documentação?", "Sim, acompanhamos financiamento, cartório e entrega das chaves."],
    ]),
    galeria: galeria([
      [imagens.imoveis, "Apartamento decorado"],
      [imagens.servicos, "Assessoria de contrato"],
      [imagens.eventos, "Área comum do condomínio"],
    ]),
  },

  transportadora: {
    cta: "Solicitar cotação",
    depoimentos: depo([
      {
        nome: "Distribuidora Alfa",
        nota: 5,
        comentario: "Coletas no horário e rastreamento enviado em toda entrega.",
      },
      {
        nome: "Eduardo Pacheco",
        nota: 5,
        comentario: "Mudança residencial sem um único item danificado.",
      },
    ]),
    formulario: form("cotacao", "Solicite uma cotação", [
      NOME,
      ZAP,
      ["Origem", "texto", true],
      ["Destino", "texto", true],
      ["Tipo de carga e peso", "textarea", true],
    ]),
    cupons: cupom(
      "Primeira coleta sem taxa",
      "Para novos contratos fechados pelo site.",
      "ROTA-ZERO",
    ),
    galeria: galeria([
      [imagens.transporte, "Frota própria"],
      [imagens.servicos, "Central de operações"],
      [imagens.imoveis, "Carga e descarga"],
    ]),
  },

  "prestador-servicos": {
    cta: "Pedir orçamento",
    depoimentos: depo([
      {
        nome: "Regina Coutinho",
        nota: 5,
        comentario: "Chegou no horário combinado e resolveu o problema no mesmo dia.",
      },
      {
        nome: "Anderson Vaz",
        nota: 5,
        comentario: "Orçamento enviado em minutos e sem cobrança extra no final.",
      },
    ]),
    formulario: form("orcamento", "Solicite um orçamento", [
      NOME,
      ZAP,
      ["Serviço necessário", "texto", true],
      ["Endereço do atendimento", "texto", false],
      ["Descreva o problema", "textarea", false],
    ]),
    cupons: cupom(
      "Visita técnica sem custo",
      "Para orçamentos aprovados no mesmo mês.",
      "VISITA-OK",
    ),
    faq: faq([
      ["Qual o prazo de atendimento?", "Atendemos em até 48 horas; urgências no mesmo dia."],
      ["Há garantia?", "Sim, 90 dias de garantia sobre o serviço executado."],
    ]),
    galeria: galeria([
      [imagens.servicos, "Equipe em campo"],
      [imagens.mecanica, "Ferramentas"],
      [imagens.imoveis, "Serviço concluído"],
    ]),
  },

  advocacia: {
    cta: "Falar com o escritório",
    formulario: form("contato", "Solicite um contato", [
      NOME,
      ZAP,
      ["Área do direito", "texto", true],
      ["Resumo do caso", "textarea", false],
    ]),
    cupons: cupom(
      "Consulta inicial orientativa",
      "Primeira reunião de 30 minutos sem custo para novos clientes.",
      "ORIENTA30",
    ),
    galeria: galeria([
      [imagens.advocacia, "Escritório"],
      [imagens.servicos, "Reunião com cliente"],
      [imagens.clinica, "Sala de atendimento"],
    ]),
  },
};
