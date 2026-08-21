import type { Produto, Site } from "./types";
import { estaAberto, moeda } from "./utils";
import { perfilCardapioPorModelo } from "./cardapio-modelos";

export type FiltroCatalogo = "todos" | "destaques" | "promocoes" | "disponiveis";

export const filtrosCatalogo: { id: FiltroCatalogo; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "destaques", rotulo: "Destaques" },
  { id: "promocoes", rotulo: "Promoções" },
  { id: "disponiveis", rotulo: "Disponíveis" },
];

/** Perfil visual do catálogo: nomes e grupos de opção variam por segmento. */
export interface PerfilCatalogo {
  /** "Cardápio", "Catálogo de produtos", "Menu"… */
  rotulo: string;
  /** CTA usado na página principal do mini-site. */
  cta: string;
  /** Texto curto de apoio abaixo do cabeçalho. */
  apoio: string;
  /** Grupos de opção apresentados no detalhe do item (somente visual). */
  gruposOpcao: string[];
  /** Estimativa de preparo/entrega exibida no cabeçalho (ajustável no editor). */
  prazo?: string;
  /** Modalidades sugeridas pelo modelo. */
  modalidades?: Modalidade[];
}

const perfilPadrao: PerfilCatalogo = {
  rotulo: "Catálogo",
  cta: "Ver catálogo",
  apoio: "Itens disponíveis no catálogo do estabelecimento.",
  gruposOpcao: ["Variações", "Observações"],
};

const perfis: Record<string, PerfilCatalogo> = {
  pizzaria: {
    rotulo: "Cardápio",
    cta: "Ver cardápio completo",
    apoio: "Sabores, tamanhos, bordas e combos para pedir agora.",
    gruposOpcao: ["Tamanho", "Sabores", "Meio a meio", "Borda recheada", "Adicionais"],
  },
  hamburgueria: {
    rotulo: "Cardápio",
    cta: "Fazer pedido",
    apoio: "Monte seu lanche, escolha combos e acompanhamentos.",
    gruposOpcao: ["Ponto da carne", "Combos", "Acompanhamentos", "Adicionais"],
  },
  restaurante: {
    rotulo: "Cardápio",
    cta: "Ver cardápio completo",
    apoio: "Entradas, pratos principais, bebidas e sobremesas.",
    gruposOpcao: ["Porção", "Acompanhamentos", "Ponto/preparo"],
  },
  doceria: {
    rotulo: "Cardápio de doces",
    cta: "Ver cardápio completo",
    apoio: "Bolos, doces, kits e encomendas para datas especiais.",
    gruposOpcao: ["Tamanho/peso", "Sabor", "Data da encomenda"],
  },
  bar: {
    rotulo: "Menu",
    cta: "Ver menu completo",
    apoio: "Bebidas, porções, combos e happy hour.",
    gruposOpcao: ["Dose ou garrafa", "Acompanhamentos", "Adicionais"],
  },
  comercio: {
    rotulo: "Catálogo de produtos",
    cta: "Ver catálogo",
    apoio: "Produtos em destaque, promoções e consulta pelo WhatsApp.",
    gruposOpcao: ["Variações", "Cor", "Tamanho"],
  },
};

/** Identifica o perfil do catálogo pelo modelo e, na falta dele, pelo segmento. */
export function perfilCatalogo(site: Site): PerfilCatalogo {
  const doModelo = perfilCardapioPorModelo(site.modeloId);
  if (doModelo) return doModelo;
  const modelo = (site.modeloId || "").toLowerCase();
  const nome = `${modelo} ${site.conteudo.nome} ${site.cliente.empresa}`.toLowerCase();
  const chave = (["pizzaria", "hamburgueria", "doceria", "bar", "restaurante"] as const).find((k) =>
    k === "hamburgueria"
      ? /hamburg|burger|lanche/.test(nome)
      : k === "bar"
        ? /\bbar\b|pub|boteco|cerveja/.test(nome)
        : nome.includes(k.slice(0, 6)),
  );
  if (chave) return perfis[chave] ?? perfilPadrao;
  if (site.cliente.segmento === "alimentacao") return perfis["restaurante"] ?? perfilPadrao;
  if (site.cliente.segmento === "comercio") return perfis["comercio"] ?? perfilPadrao;
  return perfilPadrao;
}

export const enderecoCardapio = (slug: string) => `/site/${slug}/cardapio`;

export const precoFinal = (p: Produto) =>
  p.precoPromocional && p.precoPromocional > 0 ? p.precoPromocional : p.preco;

export function descontoPercentual(p: Produto) {
  if (!p.precoPromocional || p.precoPromocional <= 0 || p.preco <= 0) return 0;
  if (p.precoPromocional >= p.preco) return 0;
  return Math.round((1 - p.precoPromocional / p.preco) * 100);
}

export const categoriasDeProdutos = (produtos: Produto[]) =>
  Array.from(new Set(produtos.map((p) => p.categoria).filter(Boolean)));

/** Seleção compacta exibida na página principal: destaques e promoções primeiro. */
export function itensDestaque(produtos: Produto[], max = 6) {
  const pontos = (p: Produto) =>
    (p.destaque ? 2 : 0) + (descontoPercentual(p) > 0 ? 1 : 0) + (p.disponivel ? 1 : 0);
  return [...produtos].sort((a, b) => pontos(b) - pontos(a)).slice(0, Math.max(0, max));
}

export function filtrarCatalogo(
  produtos: Produto[],
  { busca = "", categoria = "Todos", filtro = "todos" as FiltroCatalogo } = {},
) {
  const termo = busca.trim().toLowerCase();
  return produtos.filter((p) => {
    if (categoria !== "Todos" && p.categoria !== categoria) return false;
    if (filtro === "destaques" && !p.destaque) return false;
    if (filtro === "promocoes" && descontoPercentual(p) === 0) return false;
    if (filtro === "disponiveis" && !p.disponivel) return false;
    if (!termo) return true;
    return `${p.nome} ${p.descricao} ${p.categoria}`.toLowerCase().includes(termo);
  });
}

export interface ItemCarrinho {
  produtoId: string;
  nome: string;
  preco: number;
  quantidade: number;
  observacao?: string;
}

export type Modalidade = "entrega" | "retirada" | "mesa";
/** Mantido por compatibilidade com o carrinho do mini-site. */
export type Entrega = Modalidade;

export const rotulosModalidade: Record<Modalidade, string> = {
  entrega: "Entrega",
  retirada: "Retirada no local",
  mesa: "Mesa / comanda",
};

/** Situação do estabelecimento a partir dos horários cadastrados. */
export function situacaoAtendimento(site: Site) {
  const horarios = site.conteudo.horarios ?? [];
  if (horarios.length === 0) return { conhecida: false, aberto: false, rotulo: "Horário não informado" };
  const aberto = estaAberto(horarios);
  return { conhecida: true, aberto, rotulo: aberto ? "Aberto agora" : "Fechado agora" };
}
export type Pagamento = "pix" | "cartao" | "dinheiro";

export const rotulosPagamento: Record<Pagamento, string> = {
  pix: "Pix",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
};

export const subtotalCarrinho = (itens: ItemCarrinho[]) =>
  itens.reduce((t, i) => t + i.preco * i.quantidade, 0);

export function totaisCarrinho(itens: ItemCarrinho[], site: Site, entrega: Entrega) {
  const subtotal = subtotalCarrinho(itens);
  const taxa = entrega === "entrega" ? (site.comercio?.taxaEntrega ?? 0) : 0;
  const minimo = site.comercio?.pedidoMinimo ?? 0;
  return {
    subtotal,
    taxa,
    minimo,
    total: subtotal + taxa,
    abaixoDoMinimo: minimo > 0 && subtotal < minimo,
  };
}

export interface DadosEntrega {
  nome?: string;
  whatsapp?: string;
  horarioPreferido?: string;
  mesa?: string;
  pessoas?: string;
  endereco?: string;
  bairro?: string;
  complemento?: string;
  referencia?: string;
  observacao?: string;
  pagamento?: Pagamento;
  troco?: string;
}

/** Mensagem do pedido: só inclui o que o visitante realmente preencheu. */
export function mensagemPedido(
  site: Site,
  itens: ItemCarrinho[],
  entrega: Entrega,
  dados: DadosEntrega = {},
) {
  const { subtotal, taxa, total } = totaisCarrinho(itens, site, entrega);
  const linhas = [
    `Olá! Quero fazer um pedido pelo site ${site.conteudo.nome}:`,
    ...itens.map((i) =>
      [
        `• ${i.quantidade}x ${i.nome} — ${moeda(i.preco * i.quantidade)}`,
        i.observacao?.trim() ? `  Obs.: ${i.observacao.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    `Subtotal: ${moeda(subtotal)}`,
    taxa > 0 ? `Taxa de entrega: ${moeda(taxa)}` : "",
    `Total: ${moeda(total)}`,
    `Modalidade: ${rotulosModalidade[entrega]}`,
    dados.nome?.trim() ? `Nome: ${dados.nome.trim()}` : "",
    dados.whatsapp?.trim() ? `WhatsApp: ${dados.whatsapp.trim()}` : "",
    entrega === "mesa" && dados.mesa?.trim() ? `Mesa: ${dados.mesa.trim()}` : "",
    entrega === "mesa" && dados.pessoas?.trim() ? `Pessoas: ${dados.pessoas.trim()}` : "",
    entrega === "retirada" && dados.horarioPreferido?.trim()
      ? `Horário preferido: ${dados.horarioPreferido.trim()}`
      : "",
    dados.endereco?.trim() ? `Endereço: ${dados.endereco.trim()}` : "",
    dados.bairro?.trim() ? `Bairro: ${dados.bairro.trim()}` : "",
    dados.complemento?.trim() ? `Complemento: ${dados.complemento.trim()}` : "",
    dados.referencia?.trim() ? `Referência: ${dados.referencia.trim()}` : "",
    dados.pagamento ? `Pagamento: ${rotulosPagamento[dados.pagamento]}` : "",
    dados.pagamento === "dinheiro" && dados.troco?.trim() ? `Troco para: ${dados.troco.trim()}` : "",
    dados.observacao?.trim() ? `Observações: ${dados.observacao.trim()}` : "",
  ];
  return linhas.filter(Boolean).join("\n");
}

export type OrdemCatalogo = "destaque" | "pedidos" | "preco-asc" | "preco-desc" | "nome";

export const ordenacoesCatalogo: { id: OrdemCatalogo; rotulo: string }[] = [
  { id: "destaque", rotulo: "Destaques primeiro" },
  { id: "pedidos", rotulo: "Mais pedidos" },
  { id: "preco-asc", rotulo: "Menor preço" },
  { id: "preco-desc", rotulo: "Maior preço" },
  { id: "nome", rotulo: "Nome (A–Z)" },
];

/**
 * Ordena a lista já filtrada. "Mais pedidos" usa os itens marcados como
 * destaque pelo estabelecimento — não há métrica de vendas sem backend.
 */
export function ordenarCatalogo(produtos: Produto[], ordem: OrdemCatalogo = "destaque") {
  const lista = [...produtos];
  switch (ordem) {
    case "preco-asc":
      return lista.sort((a, b) => precoFinal(a) - precoFinal(b));
    case "preco-desc":
      return lista.sort((a, b) => precoFinal(b) - precoFinal(a));
    case "nome":
      return lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    case "pedidos":
      return lista.sort(
        (a, b) =>
          Number(b.destaque) - Number(a.destaque) ||
          Number(b.disponivel) - Number(a.disponivel) ||
          a.nome.localeCompare(b.nome, "pt-BR"),
      );
    default:
      return lista.sort(
        (a, b) =>
          Number(b.destaque) - Number(a.destaque) ||
          descontoPercentual(b) - descontoPercentual(a) ||
          Number(b.disponivel) - Number(a.disponivel),
      );
  }
}

/**
 * Rascunho anônimo do carrinho, guardado só no navegador do visitante para o
 * pedido não se perder ao navegar entre o mini-site e o cardápio.
 * Nunca guarda pedidos confirmados, clientes ou histórico.
 */
export interface RascunhoPedido {
  carrinho: Record<string, { quantidade: number; observacao: string }>;
  modalidade: Modalidade;
  pagamento?: Pagamento;
  campos: Record<string, string>;
}

const chaveRascunho = (slug: string) => `nexa:carrinho:${slug}`;

export function lerRascunhoPedido(slug: string): RascunhoPedido | null {
  if (typeof window === "undefined") return null;
  try {
    const bruto = window.localStorage.getItem(chaveRascunho(slug));
    if (!bruto) return null;
    const dado = JSON.parse(bruto) as RascunhoPedido;
    if (!dado || typeof dado !== "object" || typeof dado.carrinho !== "object") return null;
    return dado;
  } catch {
    return null;
  }
}

export function salvarRascunhoPedido(slug: string, dado: RascunhoPedido) {
  if (typeof window === "undefined") return;
  try {
    const vazio = Object.keys(dado.carrinho).length === 0;
    if (vazio) window.localStorage.removeItem(chaveRascunho(slug));
    else window.localStorage.setItem(chaveRascunho(slug), JSON.stringify(dado));
  } catch {
    /* armazenamento indisponível: o pedido segue funcionando na sessão atual */
  }
}

export function limparRascunhoPedido(slug: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(chaveRascunho(slug));
  } catch {
    /* ignorado */
  }
}
