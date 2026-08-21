import { imagens } from "./images";
import type { ConteudoDemo } from "./demo-novos";
import type { Modelo, Produto, TipoSecao } from "./types";

/**
 * Categoria "Cardápio digital": modelos com foco no catálogo (e não numa página
 * longa de apresentação). Tudo aqui é conteúdo demonstrativo e presets visuais —
 * nada sobrescreve dados reais de mini-sites já criados.
 */

export type PerfilCardapio = {
  rotulo: string;
  cta: string;
  apoio: string;
  gruposOpcao: string[];
  /** Estimativa exibida no cabeçalho público (ajustável no editor). */
  prazo: string;
  /** Modalidades sugeridas pelo segmento. */
  modalidades: ("entrega" | "retirada" | "mesa")[];
};

type ItemDemo = [nome: string, descricao: string, preco: number, extra?: Partial<Produto>];

type DefinicaoCardapio = {
  id: string;
  nome: string;
  descricao: string;
  destaque: string;
  imagem: string;
  paleta: Modelo["paleta"];
  perfil: PerfilCardapio;
  demo: {
    nome: string;
    descricao: string;
    cidade: string;
    estado: string;
    whatsapp: string;
    instagram: string;
    endereco: string;
    cta: string;
  };
  categorias: { nome: string; itens: ItemDemo[] }[];
};

const definicoes: DefinicaoCardapio[] = [
  {
    id: "cardapio-hamburgueria",
    nome: "Cardápio Digital — Hamburgueria",
    descricao:
      "Catálogo direto ao ponto: combos, ponto da carne, adicionais e pedido em poucos toques.",
    destaque: "Delivery + combos",
    imagem: imagens.hamburgueria,
    paleta: { fundo: "#0d0d0f", texto: "#fdfaf6", primaria: "#ff5722", suave: "#191a1d" },
    perfil: {
      rotulo: "Cardápio",
      cta: "Fazer pedido",
      apoio: "Smash, artesanais, combos e acompanhamentos para pedir agora.",
      gruposOpcao: [
        "Ponto da carne",
        "Trocar/remover ingredientes",
        "Adicionais",
        "Combos",
        "Bebidas",
      ],
      prazo: "Preparo médio de 25 a 35 min",
      modalidades: ["entrega", "retirada", "mesa"],
    },
    demo: {
      nome: "Brasa Burger (demonstração)",
      descricao: "Hambúrgueres artesanais na chapa, batata rústica e combos para dividir.",
      cidade: "Curitiba",
      estado: "PR",
      whatsapp: "5541990010203",
      instagram: "brasaburger.demo",
      endereco: "Av. Sete de Setembro, 1200 - Centro, Curitiba - PR",
      cta: "Pedir agora",
    },
    categorias: [
      {
        nome: "Mais pedidos",
        itens: [
          [
            "Smash Duplo",
            "Dois blends de 90g, cheddar, cebola caramelizada e molho da casa.",
            36.9,
            { destaque: true, variacoes: ["Ponto ao ponto", "Bem passado", "Sem cebola"] },
          ],
          [
            "Bacon Supreme",
            "Blend 160g, bacon crocante, queijo prato e maionese defumada.",
            39.9,
            { precoPromocional: 34.9, destaque: true },
          ],
        ],
      },
      {
        nome: "Combos",
        itens: [
          [
            "Combo Solo",
            "Hambúrguer da casa + batata pequena + refrigerante lata.",
            49.9,
            { variacoes: ["Batata rústica", "Batata palito", "Onion rings"] },
          ],
          ["Combo Duplo", "Dois hambúrgueres + batata grande + duas bebidas.", 89.9, {}],
        ],
      },
      {
        nome: "Acompanhamentos",
        itens: [
          ["Batata rústica", "Porção com alecrim e maionese verde.", 24.9, {}],
          ["Onion rings", "Anéis de cebola empanados na cerveja.", 26.9, { disponivel: false }],
        ],
      },
      {
        nome: "Bebidas",
        itens: [
          ["Refrigerante lata", "Escolha o sabor na observação.", 7.5, {}],
          ["Cerveja long neck", "Gelada, 355ml.", 12.9, {}],
        ],
      },
    ],
  },
  {
    id: "cardapio-pizzaria",
    nome: "Cardápio Digital — Pizzaria",
    descricao: "Tamanhos, sabores, meio a meio e borda recheada organizados para pedir rápido.",
    destaque: "Meio a meio + bordas",
    imagem: imagens.pizzaria,
    paleta: { fundo: "#17110d", texto: "#fdf5ea", primaria: "#e0552f", suave: "#241a13" },
    perfil: {
      rotulo: "Cardápio",
      cta: "Montar pizza",
      apoio: "Escolha tamanho, sabores, meio a meio e borda.",
      gruposOpcao: ["Tamanho", "Sabores", "Meio a meio", "Borda recheada", "Adicionais"],
      prazo: "Preparo médio de 35 a 50 min",
      modalidades: ["entrega", "retirada", "mesa"],
    },
    demo: {
      nome: "Forno de Pedra (demonstração)",
      descricao: "Massa de fermentação natural, forno a lenha e sabores clássicos da casa.",
      cidade: "Campinas",
      estado: "SP",
      whatsapp: "5519990020304",
      instagram: "fornodepedra.demo",
      endereco: "Rua Barão de Jaguara, 480 - Centro, Campinas - SP",
      cta: "Pedir pizza",
    },
    categorias: [
      {
        nome: "Tradicionais",
        itens: [
          [
            "Margherita",
            "Molho de tomate italiano, muçarela, manjericão e azeite.",
            54.9,
            { destaque: true, variacoes: ["Broto", "Média", "Grande", "Família"] },
          ],
          ["Calabresa", "Calabresa fatiada, cebola roxa e orégano.", 56.9, {}],
        ],
      },
      {
        nome: "Especiais",
        itens: [
          [
            "Portuguesa da casa",
            "Presunto, ovos, ervilha, cebola e azeitona preta.",
            68.9,
            { precoPromocional: 59.9, destaque: true },
          ],
          ["Quatro queijos", "Muçarela, gorgonzola, parmesão e catupiry.", 72.9, {}],
        ],
      },
      {
        nome: "Doces",
        itens: [
          ["Chocolate com morango", "Chocolate ao leite e morangos frescos.", 62.9, {}],
          ["Banana com canela", "Banana, açúcar, canela e leite condensado.", 58.9, {}],
        ],
      },
      {
        nome: "Bebidas",
        itens: [["Refrigerante 2L", "Coca, Guaraná ou Sprite.", 15.9, {}]],
      },
    ],
  },
  {
    id: "cardapio-restaurante",
    nome: "Cardápio Digital — Restaurante",
    descricao: "Entradas, pratos principais, executivos e sobremesas com leitura elegante.",
    destaque: "Mesa + delivery",
    imagem: imagens.restaurante,
    paleta: { fundo: "#12100e", texto: "#f8f3ea", primaria: "#d8a441", suave: "#1f1b16" },
    perfil: {
      rotulo: "Cardápio",
      cta: "Ver cardápio",
      apoio: "Entradas, pratos principais, executivos e sobremesas.",
      gruposOpcao: ["Porção", "Ponto/preparo", "Acompanhamentos", "Guarnição"],
      prazo: "Preparo médio de 25 a 40 min",
      modalidades: ["mesa", "entrega", "retirada"],
    },
    demo: {
      nome: "Casa Oliva (demonstração)",
      descricao: "Cozinha contemporânea com ingredientes da estação e carta de vinhos autoral.",
      cidade: "Porto Alegre",
      estado: "RS",
      whatsapp: "5551990030405",
      instagram: "casaoliva.demo",
      endereco: "Rua Padre Chagas, 320 - Moinhos de Vento, Porto Alegre - RS",
      cta: "Reservar mesa",
    },
    categorias: [
      {
        nome: "Entradas",
        itens: [
          ["Burrata da casa", "Burrata cremosa, tomates confitados e pesto.", 46.9, {}],
          [
            "Bruschetta de cogumelos",
            "Pão de fermentação natural e cogumelos salteados.",
            38.9,
            {},
          ],
        ],
      },
      {
        nome: "Pratos principais",
        itens: [
          [
            "Ancho grelhado",
            "Ancho 300g, batatas rústicas e manteiga de ervas.",
            94.9,
            { destaque: true, variacoes: ["Mal passado", "Ao ponto", "Bem passado"] },
          ],
          ["Risoto de funghi", "Arroz arbóreo, funghi secchi e parmesão.", 72.9, {}],
        ],
      },
      {
        nome: "Executivos",
        itens: [
          [
            "Executivo do dia",
            "Prato principal, guarnição e salada. Servido de segunda a sexta.",
            49.9,
            { precoPromocional: 42.9, destaque: true },
          ],
        ],
      },
      {
        nome: "Sobremesas",
        itens: [["Petit gâteau", "Bolo quente de chocolate com sorvete de creme.", 32.9, {}]],
      },
    ],
  },
  {
    id: "cardapio-bar",
    nome: "Cardápio Digital — Bar e Petiscos",
    descricao: "Chopes, drinks, porções e happy hour com clima noturno e comanda por mesa.",
    destaque: "Comanda por mesa",
    imagem: imagens.bar,
    paleta: { fundo: "#101114", texto: "#f4f0e8", primaria: "#f0b429", suave: "#1b1d22" },
    perfil: {
      rotulo: "Menu",
      cta: "Ver menu",
      apoio: "Chopes, drinks autorais, porções e combinações para dividir.",
      gruposOpcao: ["Dose ou garrafa", "Tamanho da porção", "Adicionais", "Gelo e limão"],
      prazo: "Preparo médio de 15 a 30 min",
      modalidades: ["mesa", "retirada", "entrega"],
    },
    demo: {
      nome: "Boteco do Farol (demonstração)",
      descricao: "Chope gelado, petiscos generosos e música ao vivo de quinta a sábado.",
      cidade: "Recife",
      estado: "PE",
      whatsapp: "5581990040506",
      instagram: "botecodofarol.demo",
      endereco: "Rua da Aurora, 145 - Boa Vista, Recife - PE",
      cta: "Chamar no WhatsApp",
    },
    categorias: [
      {
        nome: "Porções",
        itens: [
          [
            "Bolinho de bacalhau",
            "12 unidades com maionese de limão siciliano.",
            48.9,
            { destaque: true, variacoes: ["Meia porção", "Porção inteira"] },
          ],
          ["Frango à passarinho", "Alho crocante e limão.", 52.9, {}],
        ],
      },
      {
        nome: "Chopes e cervejas",
        itens: [
          ["Chope pilsen 300ml", "Torneira gelada, colarinho na medida.", 12.9, {}],
          ["Cerveja artesanal IPA", "Long neck 355ml, produção local.", 21.9, {}],
        ],
      },
      {
        nome: "Drinks",
        itens: [
          [
            "Caipirinha da casa",
            "Cachaça artesanal, limão e açúcar. Frutas na observação.",
            26.9,
            { variacoes: ["Limão", "Maracujá", "Morango"] },
          ],
          ["Gin tônica", "Gin, tônica, zimbro e laranja.", 34.9, { precoPromocional: 29.9 }],
        ],
      },
      {
        nome: "Happy hour",
        itens: [["Combo 2 chopes + porção", "Válido de terça a quinta, das 17h às 20h.", 69.9, {}]],
      },
    ],
  },
  {
    id: "cardapio-doceria",
    nome: "Cardápio Digital — Doceria",
    descricao: "Vitrine de doces, bolos por fatia e encomendas com datas combinadas.",
    destaque: "Vitrine + encomendas",
    imagem: imagens.doceria,
    paleta: { fundo: "#fff7fa", texto: "#2c1e26", primaria: "#d8578d", suave: "#ffe6ef" },
    perfil: {
      rotulo: "Cardápio de doces",
      cta: "Ver vitrine",
      apoio: "Bolos, docinhos, kits e encomendas para datas especiais.",
      gruposOpcao: ["Tamanho/peso", "Sabor da massa", "Recheio", "Data da encomenda"],
      prazo: "Retirada no mesmo dia; encomendas com 48h",
      modalidades: ["retirada", "entrega"],
    },
    demo: {
      nome: "Doce Ateliê (demonstração)",
      descricao: "Confeitaria artesanal com bolos de festa, docinhos finos e kits para presente.",
      cidade: "Belo Horizonte",
      estado: "MG",
      whatsapp: "5531990050607",
      instagram: "doceatelie.demo",
      endereco: "Rua Fernandes Tourinho, 88 - Savassi, Belo Horizonte - MG",
      cta: "Encomendar",
    },
    categorias: [
      {
        nome: "Bolos",
        itens: [
          [
            "Bolo de brigadeiro",
            "Massa de chocolate, recheio de brigadeiro belga.",
            139.9,
            { destaque: true, variacoes: ["1 kg", "1,5 kg", "2 kg"] },
          ],
          ["Naked cake de morango", "Chantilly, morangos frescos e massa branca.", 159.9, {}],
        ],
      },
      {
        nome: "Fatias",
        itens: [
          ["Fatia de bolo do dia", "Sabor divulgado diariamente no Instagram.", 16.9, {}],
          ["Cheesecake de frutas vermelhas", "Base crocante e calda artesanal.", 22.9, {}],
        ],
      },
      {
        nome: "Docinhos",
        itens: [
          [
            "Cento de docinhos finos",
            "Brigadeiro, beijinho, casadinho e nozes.",
            219.9,
            { precoPromocional: 189.9, destaque: true },
          ],
        ],
      },
      {
        nome: "Kits presente",
        itens: [["Kit café da manhã", "Bolo caseiro, geleia, pão e suco.", 129.9, {}]],
      },
    ],
  },
  {
    id: "cardapio-cafeteria",
    nome: "Cardápio Digital — Cafeteria",
    descricao: "Cafés especiais, brunch e doces em um cardápio leve, claro e rápido no celular.",
    destaque: "Café + brunch",
    imagem: imagens.cafeteria,
    paleta: { fundo: "#fbf7f1", texto: "#241d16", primaria: "#a9682f", suave: "#f0e6d8" },
    perfil: {
      rotulo: "Cardápio",
      cta: "Ver cardápio",
      apoio: "Cafés especiais, brunch, salgados e doces do dia.",
      gruposOpcao: ["Tamanho", "Tipo de leite", "Grão/método", "Adoçar", "Adicionais"],
      prazo: "Preparo médio de 10 a 20 min",
      modalidades: ["mesa", "retirada", "entrega"],
    },
    demo: {
      nome: "Café Ateliê 21 (demonstração)",
      descricao: "Torras próprias, métodos filtrados e confeitaria fresca todos os dias.",
      cidade: "São Paulo",
      estado: "SP",
      whatsapp: "5511990060708",
      instagram: "cafeatelie21.demo",
      endereco: "Rua Aspicuelta, 210 - Vila Madalena, São Paulo - SP",
      cta: "Ver cardápio",
    },
    categorias: [
      {
        nome: "Cafés",
        itens: [
          [
            "Espresso duplo",
            "Blend da casa com notas de cacau e caramelo.",
            9.9,
            { destaque: true, variacoes: ["Curto", "Longo"] },
          ],
          [
            "Cappuccino cremoso",
            "Espresso, leite vaporizado e canela opcional.",
            14.9,
            { variacoes: ["Leite integral", "Leite vegetal", "Sem lactose"] },
          ],
          ["Coado V60", "Grão especial da semana, 250ml.", 16.9, {}],
        ],
      },
      {
        nome: "Brunch",
        itens: [
          [
            "Tostada de abacate",
            "Pão de fermentação natural, abacate, ovo pochê e gergelim.",
            34.9,
            { destaque: true },
          ],
          ["Pão na chapa com ovos", "Clássico com café coado incluso.", 24.9, {}],
        ],
      },
      {
        nome: "Doces",
        itens: [
          ["Cookie de chocolate", "Casquinha crocante e centro macio.", 12.9, {}],
          ["Bolo de laranja", "Fatia generosa com calda cítrica.", 13.9, { precoPromocional: 9.9 }],
        ],
      },
    ],
  },
  {
    id: "cardapio-acai",
    nome: "Cardápio Digital — Açaí e Sorveteria",
    descricao: "Montagem por tamanho, coberturas e adicionais com visual colorido e direto.",
    destaque: "Monte o seu",
    imagem: imagens.acai,
    paleta: { fundo: "#150f21", texto: "#f7f2ff", primaria: "#8c4dff", suave: "#221934" },
    perfil: {
      rotulo: "Cardápio",
      cta: "Montar meu açaí",
      apoio: "Tamanhos, coberturas, frutas e adicionais para montar o seu.",
      gruposOpcao: ["Tamanho", "Coberturas", "Frutas", "Adicionais", "Complementos"],
      prazo: "Preparo médio de 10 a 20 min",
      modalidades: ["entrega", "retirada", "mesa"],
    },
    demo: {
      nome: "Açaí do Porto (demonstração)",
      descricao: "Açaí cremoso batido na hora, sorvetes artesanais e milkshakes.",
      cidade: "Belém",
      estado: "PA",
      whatsapp: "5591990070809",
      instagram: "acaidoporto.demo",
      endereco: "Av. Nazaré, 900 - Nazaré, Belém - PA",
      cta: "Pedir açaí",
    },
    categorias: [
      {
        nome: "Açaí",
        itens: [
          [
            "Açaí 300ml",
            "Dois acompanhamentos inclusos. Escolha na observação.",
            18.9,
            { destaque: true, variacoes: ["300ml", "500ml", "700ml"] },
          ],
          ["Açaí 500ml", "Três acompanhamentos inclusos.", 24.9, { destaque: true }],
          ["Barca de açaí 1L", "Ideal para dividir, cinco acompanhamentos.", 44.9, {}],
        ],
      },
      {
        nome: "Sorvetes",
        itens: [
          ["Sorvete artesanal (bola)", "Sabores do dia na vitrine.", 9.9, {}],
          [
            "Milkshake 400ml",
            "Chocolate, morango ou ovomaltine.",
            22.9,
            { precoPromocional: 18.9 },
          ],
        ],
      },
      {
        nome: "Adicionais",
        itens: [
          ["Adicional de fruta", "Banana, morango, kiwi ou manga.", 4.5, {}],
          ["Adicional de cobertura", "Leite condensado, nutella ou mel.", 5.5, {}],
        ],
      },
    ],
  },
  {
    id: "cardapio-marmitas",
    nome: "Cardápio Digital — Marmitas",
    descricao: "Cardápio da semana, tamanhos de marmita e planos de assinatura para o almoço.",
    destaque: "Cardápio da semana",
    imagem: imagens.marmita,
    paleta: { fundo: "#f7f8f3", texto: "#1d221a", primaria: "#3f7d3a", suave: "#e6eee2" },
    perfil: {
      rotulo: "Cardápio da semana",
      cta: "Ver cardápio do dia",
      apoio: "Marmitas frescas, tamanhos e planos semanais para o almoço.",
      gruposOpcao: ["Tamanho", "Guarnição", "Salada", "Sem cebola/alho", "Talheres"],
      prazo: "Entregas do almoço até 11h30",
      modalidades: ["entrega", "retirada"],
    },
    demo: {
      nome: "Cozinha da Vila (demonstração)",
      descricao: "Comida caseira feita todo dia, com opções fit, veganas e planos semanais.",
      cidade: "Goiânia",
      estado: "GO",
      whatsapp: "5562990080910",
      instagram: "cozinhadavila.demo",
      endereco: "Rua 15, 210 - Setor Central, Goiânia - GO",
      cta: "Pedir marmita",
    },
    categorias: [
      {
        nome: "Marmitas do dia",
        itens: [
          [
            "Marmita tradicional",
            "Arroz, feijão, proteína do dia, guarnição e salada.",
            24.9,
            { destaque: true, variacoes: ["P (400g)", "M (600g)", "G (800g)"] },
          ],
          ["Marmita fit", "Arroz integral, frango grelhado e legumes no vapor.", 27.9, {}],
          ["Marmita vegana", "Grão-de-bico, arroz sete grãos e legumes assados.", 26.9, {}],
        ],
      },
      {
        nome: "Planos",
        itens: [
          [
            "Plano 5 marmitas",
            "Uma marmita por dia útil, entregue no seu horário.",
            119.9,
            { precoPromocional: 109.9, destaque: true },
          ],
          ["Plano 10 marmitas", "Duas semanas de almoço com cardápio variado.", 219.9, {}],
        ],
      },
      {
        nome: "Complementos",
        itens: [
          ["Sobremesa do dia", "Pudim, gelatina ou doce caseiro.", 7.9, {}],
          ["Suco natural 500ml", "Laranja, maracujá ou limão.", 9.9, {}],
        ],
      },
    ],
  },
];

const SECOES_CARDAPIO: TipoSecao[] = [
  "apresentacao",
  "produtos",
  "cardapio",
  "promocao",
  "links",
  "horarios",
  "localizacao",
  "rodape",
];

function produtosDe(def: DefinicaoCardapio): Produto[] {
  return def.categorias.flatMap((cat, ci) =>
    cat.itens.map(([nome, descricao, preco, extra], ii) => ({
      id: `${def.id}-p${ci}${ii}`,
      nome,
      descricao,
      preco,
      categoria: cat.nome,
      variacoes: [],
      disponivel: true,
      destaque: false,
      imagem: def.imagem,
      ...extra,
    })),
  );
}

/** Modelos da categoria "Cardápio digital" exibidos na galeria. */
export const modelosCardapio: Modelo[] = definicoes.map((d) => ({
  id: d.id,
  nome: d.nome,
  segmento: "alimentacao",
  layout: "catalogo",
  descricao: d.descricao,
  destaque: d.destaque,
  paleta: d.paleta,
  imagem: d.imagem,
  familia: "cardapio",
}));

/** Presets de seções: abre com o catálogo, sem página longa de apresentação. */
export const presetsCardapio = Object.fromEntries(
  definicoes.map((d) => [
    d.id,
    {
      secoes: SECOES_CARDAPIO,
      formulario: "contato" as const,
      tituloFormulario: "Fale com a loja",
      titulos: {
        produtos: d.perfil.rotulo,
        cardapio: "Categorias",
        promocao: "Promoções do dia",
        apresentacao: "Sobre",
      },
    },
  ]),
);

/** Conteúdo demonstrativo de cada modelo de cardápio digital. */
export const conteudoCardapioModelos: Record<string, ConteudoDemo> = Object.fromEntries(
  definicoes.map((d) => [
    d.id,
    {
      nome: d.demo.nome,
      descricao: d.demo.descricao,
      cidade: d.demo.cidade,
      estado: d.demo.estado,
      whatsapp: d.demo.whatsapp,
      instagram: d.demo.instagram,
      endereco: d.demo.endereco,
      cta: d.demo.cta,
      secoes: SECOES_CARDAPIO,
      produtos: produtosDe(d),
    } satisfies ConteudoDemo,
  ]),
);

const perfisPorModelo: Record<string, PerfilCardapio> = Object.fromEntries(
  definicoes.map((d) => [d.id, d.perfil]),
);

export const perfilCardapioPorModelo = (modeloId?: string) =>
  modeloId ? perfisPorModelo[modeloId] : undefined;

export const ehModeloCardapio = (modeloId?: string) =>
  Boolean(modeloId && perfisPorModelo[modeloId]);
