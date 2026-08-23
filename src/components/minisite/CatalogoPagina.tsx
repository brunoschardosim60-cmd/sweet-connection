import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  Clock,
  Info,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { whatsappLink } from "@/lib/nexa/brand";
import { eventoMarketing } from "@/lib/nexa/rastreio-marketing";
import { supabase } from "@/integrations/supabase/client";
import {
  buscarMeusPedidosPublicos,
  buscarEstoquePublicado,
  avaliarPedidoPublicado,
  criarPedidoPublicado,
  guardarAcompanhamentoPedido,
  notificarDonoDoMinisite,
  registrarEventoPublicado,
  type PedidoPublico,
} from "@/lib/nexa/public-api";
import { moeda } from "@/lib/nexa/utils";
import { contraste, estiloMiniSite, hexToRgba } from "@/components/minisite/estilo";
import { useFocoModal } from "@/components/minisite/useFocoModal";
import {
  categoriasDeProdutos,
  descontoPercentual,
  filtrarCatalogo,
  filtrosCatalogo,
  lerRascunhoPedido,
  ordenacoesCatalogo,
  ordenarCatalogo,
  perfilCatalogo,
  produtoDisponivelAgora,
  precoFinal,
  rotulosModalidade,
  rotulosPagamento,
  situacaoAtendimento,
  salvarRascunhoPedido,
  limparRascunhoPedido,
  totaisCarrinho,
  whatsappValido,
  formatarTelefonePedido,
  type Entrega,
  type OrdemCatalogo,
  type FiltroCatalogo,
  type ItemCarrinho,
  type Pagamento,
} from "@/lib/nexa/catalogo";
import type { Produto, Site } from "@/lib/nexa/types";

interface CamposEntrega {
  nome: string;
  whatsapp: string;
  horarioPreferido: string;
  mesa: string;
  pessoas: string;
  endereco: string;
  bairro: string;
  complemento: string;
  referencia: string;
  observacao: string;
  troco: string;
}

interface LinhaCarrinho {
  quantidade: number;
  observacao: string;
}

interface ProdutoAnimado {
  imagem: string;
  inicioX: number;
  inicioY: number;
  destinoX: number;
  destinoY: number;
}

/**
 * Página pública de catálogo/cardápio do mini-site.
 * Usa apenas os produtos já cadastrados; nada é inventado ou salvo automaticamente.
 */
export function CatalogoPagina({
  site,
  rastrear = false,
  interacoesExternas = true,
  mostrarVoltar = true,
  previewEstreita = false,
  forcarDestaqueInicial = false,
  mostrarCarrinhoFlutuante = true,
}: {
  site: Site;
  rastrear?: boolean;
  interacoesExternas?: boolean;
  /** Cardápios digitais usam esta página como entrada principal. */
  mostrarVoltar?: boolean;
  previewEstreita?: boolean;
  /** Usado somente pela prévia do editor para revisar o destaque sem publicar. */
  forcarDestaqueInicial?: boolean;
  /** Desliga a barra fixa quando o catálogo está dentro de outra tela, como o editor. */
  mostrarCarrinhoFlutuante?: boolean;
}) {
  const perfil = perfilCatalogo(site);
  const primaria = site.aparencia.corPrimaria;
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todos");
  const [filtro, setFiltro] = useState<FiltroCatalogo>("todos");
  const [ordem, setOrdem] = useState<OrdemCatalogo>("destaque");
  const [carregando, setCarregando] = useState(true);
  const [detalhe, setDetalhe] = useState<Produto | null>(null);
  const [carrinho, setCarrinho] = useState<Record<string, LinhaCarrinho>>({});
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [entrega, setEntrega] = useState<Entrega>("entrega");
  const [pagamento, setPagamento] = useState<Pagamento | undefined>(undefined);
  const [campos, setCampos] = useState<CamposEntrega>({
    nome: "",
    whatsapp: "",
    horarioPreferido: "",
    mesa: "",
    pessoas: "",
    endereco: "",
    bairro: "",
    complemento: "",
    referencia: "",
    observacao: "",
    troco: "",
  });

  const [restaurado, setRestaurado] = useState(false);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [retornoPedido, setRetornoPedido] = useState<string>("");
  const [ranking, setRanking] = useState<Record<string, number>>({});
  const [estoqueAtual, setEstoqueAtual] = useState<Record<string, number>>({});
  const [produtoAnimado, setProdutoAnimado] = useState<ProdutoAnimado | null>(null);
  const [contadorAnimado, setContadorAnimado] = useState(false);
  const carrinhoCabecalhoRef = useRef<HTMLButtonElement>(null);
  const carrinhoFlutuanteRef = useRef<HTMLButtonElement>(null);
  const [meusPedidos, setMeusPedidos] = useState<PedidoPublico[]>([]);
  const [pedidosAbertos, setPedidosAbertos] = useState(false);
  const [atualizandoPedidos, setAtualizandoPedidos] = useState(false);
  const destaque = site.comercio?.destaqueAbertura;
  const [destaqueAberto, setDestaqueAberto] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setCarregando(false), 250);
    return () => clearTimeout(t);
  }, []);

  // Rascunho anônimo: recupera o carrinho ao voltar do mini-site.
  useEffect(() => {
    const salvo = lerRascunhoPedido(site.slug);
    if (salvo) {
      setCarrinho(salvo.carrinho ?? {});
      if (salvo.modalidade) setEntrega(salvo.modalidade);
      if (salvo.pagamento) setPagamento(salvo.pagamento);
      if (salvo.campos) setCampos((c) => ({ ...c, ...salvo.campos }));
    }
    // Link de mesa (/cardapio?mesa=12) já abre na modalidade correta.
    const mesa = new URLSearchParams(window.location.search).get("mesa");
    if (mesa) {
      setEntrega("mesa");
      setCampos((c) => ({ ...c, mesa }));
    }
    setRestaurado(true);
  }, [site.slug]);

  useEffect(() => {
    if (!interacoesExternas) return;
    void buscarEstoquePublicado(site.slug).then(setEstoqueAtual);
  }, [interacoesExternas, site.slug]);

  const atualizarMeusPedidos = useCallback(async () => {
    if (!interacoesExternas) return;
    setAtualizandoPedidos(true);
    try {
      setMeusPedidos(await buscarMeusPedidosPublicos(site.slug));
    } catch {
      // O pedido continua salvo no estabelecimento; a atualização pode ser tentada de novo.
    } finally {
      setAtualizandoPedidos(false);
    }
  }, [interacoesExternas, site.slug]);

  useEffect(() => {
    void atualizarMeusPedidos();
  }, [atualizarMeusPedidos]);

  useEffect(() => {
    if ((!interacoesExternas && !forcarDestaqueInicial) || !destaque?.ativo || !destaque.imagem)
      return;
    if (forcarDestaqueInicial) {
      setDestaqueAberto(true);
      return;
    }
    try {
      if (!window.sessionStorage.getItem(`nexa:menu-highlight:${site.slug}`)) {
        setDestaqueAberto(true);
      }
    } catch {
      setDestaqueAberto(true);
    }
  }, [destaque?.ativo, destaque?.imagem, forcarDestaqueInicial, interacoesExternas, site.slug]);

  useEffect(() => {
    if (!interacoesExternas || meusPedidos.length === 0) return;
    const atualizarQuandoVisivel = () => {
      if (document.visibilityState === "visible") void atualizarMeusPedidos();
    };
    const intervalo = window.setInterval(atualizarQuandoVisivel, 45_000);
    document.addEventListener("visibilitychange", atualizarQuandoVisivel);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", atualizarQuandoVisivel);
    };
  }, [atualizarMeusPedidos, interacoesExternas, meusPedidos.length]);

  useEffect(() => {
    if (!restaurado) return;
    salvarRascunhoPedido(site.slug, {
      carrinho,
      modalidade: entrega,
      ...(pagamento ? { pagamento } : {}),
      campos: { ...campos },
    });
  }, [restaurado, site.slug, carrinho, entrega, pagamento, campos]);

  useEffect(() => {
    if (rastrear) void registrarEventoPublicado(site.slug, "visita", "cardapio").catch(() => {});
  }, [rastrear, site.slug]);

  useEffect(() => {
    void supabase
      .rpc("nexa_ranking_produtos_cardapio", { requested_slug: site.slug })
      .then(({ data }) =>
        setRanking(Object.fromEntries((data ?? []).map((item) => [item.produto_id, item.pedidos]))),
      );
  }, [site.slug]);

  const registrar = (rotulo: string, whatsapp = false) => {
    if (rastrear)
      void registrarEventoPublicado(site.slug, whatsapp ? "whatsapp" : "clique", rotulo).catch(
        () => {},
      );
  };

  const produtosPublicos = useMemo(
    () =>
      site.produtos.map((produto) => {
        const quantidade = estoqueAtual[produto.id];
        return quantidade === undefined ? produto : { ...produto, estoque: quantidade };
      }),
    [estoqueAtual, site.produtos],
  );
  const categorias = useMemo(
    () => ["Todos", ...categoriasDeProdutos(produtosPublicos)],
    [produtosPublicos],
  );
  const lista = useMemo(
    () =>
      ordenarCatalogo(
        filtrarCatalogo(produtosPublicos, { busca, categoria, filtro }),
        ordem,
        ranking,
      ),
    [produtosPublicos, busca, categoria, filtro, ordem, ranking],
  );
  /** Catálogo sem nenhum item cadastrado — diferente de "filtro sem resultado". */
  const catalogoVazio = !carregando && produtosPublicos.length === 0;

  const itens: ItemCarrinho[] = produtosPublicos
    .filter((p) => (carrinho[p.id]?.quantidade ?? 0) > 0)
    .map((p) => {
      const observacao = carrinho[p.id]?.observacao ?? "";
      return {
        produtoId: p.id,
        nome: p.nome,
        preco: precoFinal(p),
        quantidade: carrinho[p.id]?.quantidade ?? 0,
        ...(observacao ? { observacao } : {}),
      };
    });

  const totais = totaisCarrinho(itens, site, entrega, campos.bairro);
  const situacao = situacaoAtendimento(site);
  const quantidadeTotal = itens.reduce((t, i) => t + i.quantidade, 0);

  const alterar = (p: Produto, delta: number, observacao?: string, origem?: HTMLElement) => {
    if (delta > 0) {
      eventoMarketing("add_to_cart", { item_id: p.id, quantidade: delta });
      setContadorAnimado(true);
      window.setTimeout(() => setContadorAnimado(false), 380);

      // A imagem sai do botão acionado e termina no carrinho que o cliente está vendo.
      if (mostrarCarrinhoFlutuante && origem && p.imagem) {
        window.requestAnimationFrame(() => {
          const inicio = origem.getBoundingClientRect();
          const destino = (
            carrinhoFlutuanteRef.current ?? carrinhoCabecalhoRef.current
          )?.getBoundingClientRect();
          if (!destino) return;
          setProdutoAnimado({
            imagem: p.imagem!,
            inicioX: inicio.left + inicio.width / 2 - 20,
            inicioY: inicio.top + inicio.height / 2 - 20,
            destinoX: destino.left + destino.width / 2 - (inicio.left + inicio.width / 2),
            destinoY: destino.top + destino.height / 2 - (inicio.top + inicio.height / 2),
          });
          window.setTimeout(() => setProdutoAnimado(null), 560);
        });
      }
    }
    setCarrinho((atual) => {
      const linha = atual[p.id] ?? { quantidade: 0, observacao: "" };
      const quantidade = Math.max(0, linha.quantidade + delta);
      const copia = { ...atual };
      if (quantidade === 0) delete copia[p.id];
      else copia[p.id] = { quantidade, observacao: observacao ?? linha.observacao };
      return copia;
    });
  };

  const definirObservacao = (id: string, observacao: string) =>
    setCarrinho((atual) => (atual[id] ? { ...atual, [id]: { ...atual[id], observacao } } : atual));

  const confirmarPedido = async () => {
    if (!interacoesExternas) {
      setRetornoPedido("Esta é uma prévia. Publique o cardápio para receber pedidos reais.");
      return;
    }
    setRetornoPedido("");
    setEnviandoPedido(true);
    try {
      const pedido = await criarPedidoPublicado(site.slug, itens, entrega, {
        ...campos,
        ...(pagamento ? { pagamento } : {}),
      });
      limparRascunhoPedido(site.slug);
      guardarAcompanhamentoPedido(site.slug, pedido.trackingToken);
      setCarrinho({});
      setCarrinhoAberto(false);
      void buscarEstoquePublicado(site.slug).then(setEstoqueAtual);
      setRetornoPedido(`Pedido #${pedido.codigo} confirmado. A equipe recebeu sua solicitação.`);
      await atualizarMeusPedidos();
      setPedidosAbertos(true);
      eventoMarketing("iniciar_checkout", {
        value: pedido.total,
        currency: "BRL",
        transaction_id: pedido.id,
      });
      registrar("Catálogo: pedido confirmado");
      notificarDonoDoMinisite("pedido", pedido.id);
    } catch (error) {
      setRetornoPedido(
        error instanceof Error ? error.message : "Não foi possível confirmar o pedido.",
      );
    } finally {
      setEnviandoPedido(false);
    }
  };

  const botaoPrimario = {
    background: primaria,
    color: contraste(primaria),
    borderRadius: site.aparencia.botao === "pill" ? "999px" : "var(--ms-radius)",
  };

  return (
    <div
      style={estiloMiniSite(site)}
      className={`nexa-catalogo ${interacoesExternas ? "nexa-catalogo-publico" : ""} @container min-h-screen w-full overflow-x-hidden text-[15px] leading-relaxed`}
    >
      <header
        className="sticky top-0 z-30 w-full backdrop-blur"
        style={{
          background: hexToRgba(site.aparencia.corFundo, 0.92),
          borderBottom: "1px solid var(--ms-border)",
        }}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 pb-2 pt-3">
          {mostrarVoltar ? (
            <a
              href={interacoesExternas ? `/site/${site.slug}` : undefined}
              aria-label="Voltar ao site"
              className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ outlineColor: primaria }}
            >
              <ArrowLeft size={16} aria-hidden />
              <span className="hidden @2xl:inline">Voltar ao site</span>
            </a>
          ) : null}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {site.conteudo.logo && (
              <img
                src={site.conteudo.logo}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold leading-tight @md:text-sm">
                {site.conteudo.nome}
              </p>
              <p className="mt-0.5 truncate text-[10px] leading-tight opacity-70 @md:text-[11px]">
                {perfil.rotulo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {meusPedidos.length > 0 && (
              <button
                type="button"
                onClick={() => setPedidosAbertos(true)}
                className="hidden min-h-11 items-center px-2 text-xs font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 @md:inline-flex"
                style={{ outlineColor: primaria }}
              >
                Meus pedidos
              </button>
            )}
            <button
              ref={carrinhoCabecalhoRef}
              type="button"
              onClick={() => setCarrinhoAberto(true)}
              aria-label={`Abrir carrinho com ${quantidadeTotal} ${quantidadeTotal === 1 ? "item" : "itens"}`}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 px-3 text-sm font-semibold transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none ${
                contadorAnimado ? "scale-110" : "scale-100"
              }`}
              style={{
                ...botaoPrimario,
                opacity: quantidadeTotal > 0 ? 1 : 0.85,
                outlineColor: primaria,
              }}
            >
              <ShoppingBag size={16} aria-hidden />
              <span
                aria-hidden
                className={`transition-transform motion-reduce:transition-none ${contadorAnimado ? "scale-125" : "scale-100"}`}
              >
                {quantidadeTotal}
              </span>
            </button>
          </div>
        </div>

        <div
          className="mx-auto flex w-full max-w-7xl items-center gap-1.5 overflow-x-auto px-4 pb-3 text-[11px] scrollbar-invisivel"
          aria-label="Informações do estabelecimento"
        >
          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold"
            style={{
              background: hexToRgba(situacao.aberto ? primaria : "#888888", 0.16),
              color: situacao.aberto ? primaria : "inherit",
            }}
          >
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ background: situacao.aberto ? primaria : "currentColor" }}
            />
            {situacao.rotulo}
          </span>
          {perfil.prazo && (
            <span
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 opacity-80"
              style={{ border: "1px solid var(--ms-border)" }}
            >
              <Clock size={12} aria-hidden /> {perfil.prazo}
            </span>
          )}
          {site.conteudo.endereco && (
            <a
              href={
                interacoesExternas
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.conteudo.endereco)}`
                  : undefined
              }
              target="_blank"
              rel="noreferrer"
              className="hidden min-h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 opacity-80 focus-visible:outline focus-visible:outline-2 @md:inline-flex"
              style={{ border: "1px solid var(--ms-border)", outlineColor: primaria }}
            >
              <MapPin size={12} aria-hidden /> Como chegar
            </a>
          )}
          {site.conteudo.whatsapp && (
            <a
              href={interacoesExternas ? whatsappLink(site.conteudo.whatsapp, "") : undefined}
              target="_blank"
              rel="noreferrer"
              onClick={() => registrar("Cardápio: WhatsApp do cabeçalho", true)}
              className="hidden min-h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 opacity-80 focus-visible:outline focus-visible:outline-2 @lg:inline-flex"
              style={{ border: "1px solid var(--ms-border)", outlineColor: primaria }}
            >
              <MessageCircle size={12} aria-hidden /> WhatsApp
            </a>
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 pb-32 pt-5 @5xl:pb-10">
        <main className="min-w-0">
          {site.conteudo.capa && (
            <div
              className="relative mb-5 h-40 overflow-hidden"
              style={{ borderRadius: "var(--ms-radius)", border: "1px solid var(--ms-border)" }}
            >
              <img
                src={site.conteudo.capa}
                alt={`Ambiente de ${site.conteudo.nome}`}
                className="h-full w-full object-cover"
                style={{
                  objectPosition: (site.aparencia.capaPosicao ?? "centro").replaceAll("-", " "),
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <p className="text-lg font-semibold leading-tight">{site.conteudo.nome}</p>
                {site.conteudo.descricao && (
                  <p className="mt-1 line-clamp-2 text-xs text-white/85">
                    {site.conteudo.descricao}
                  </p>
                )}
              </div>
            </div>
          )}
          <h1 className="text-2xl font-semibold">{perfil.rotulo}</h1>
          <p className="mt-1 text-sm opacity-75">{perfil.apoio}</p>

          {!catalogoVazio && (
            <div
              className="sticky top-[104px] z-20 -mx-4 mt-4 flex flex-col gap-3 px-4 py-3 backdrop-blur @5xl:top-[72px]"
              style={{ background: hexToRgba(site.aparencia.corFundo, 0.96) }}
            >
              <label className="sr-only" htmlFor="busca-catalogo">
                Buscar por nome, descrição ou categoria
              </label>
              <div
                className="flex min-h-11 items-center gap-2 px-3 py-2"
                style={{
                  background: "var(--ms-surface)",
                  border: "1px solid var(--ms-border)",
                  borderRadius: "var(--ms-radius)",
                }}
              >
                <Search size={15} className="opacity-60" aria-hidden />
                <input
                  id="busca-catalogo"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, descrição ou categoria"
                  className="w-full bg-transparent text-sm outline-none placeholder:opacity-50"
                  style={{ color: "inherit" }}
                />
              </div>

              <FaixaRolavel ariaLabel="Filtros do catálogo">
                {filtrosCatalogo.map((f) => (
                  <Chip
                    key={f.id}
                    ativo={filtro === f.id}
                    cor={primaria}
                    onClick={() => setFiltro(f.id)}
                  >
                    {f.rotulo}
                  </Chip>
                ))}
              </FaixaRolavel>

              {categorias.length > 1 && (
                <FaixaRolavel ariaLabel="Categorias">
                  {categorias.map((c) => (
                    <Chip
                      key={c}
                      ativo={categoria === c}
                      cor={primaria}
                      onClick={() => setCategoria(c)}
                    >
                      {c}
                    </Chip>
                  ))}
                </FaixaRolavel>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p aria-live="polite" className="text-xs opacity-70">
                  {carregando
                    ? "Carregando itens…"
                    : `${lista.length} ${lista.length === 1 ? "item encontrado" : "itens encontrados"}`}
                </p>
                <label htmlFor="ordem-catalogo" className="sr-only">
                  Ordenar por
                </label>
                <select
                  id="ordem-catalogo"
                  value={ordem}
                  onChange={(e) => setOrdem(e.target.value as OrdemCatalogo)}
                  className="min-h-11 max-w-full bg-transparent px-3 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    border: "1px solid var(--ms-border)",
                    borderRadius: "999px",
                    color: "inherit",
                    colorScheme: site.aparencia.tema === "escuro" ? "dark" : "light",
                    outlineColor: primaria,
                  }}
                >
                  {ordenacoesCatalogo.map((o) => (
                    <option
                      key={o.id}
                      value={o.id}
                      style={{
                        backgroundColor: site.aparencia.corFundo,
                        color: site.aparencia.corTexto,
                      }}
                    >
                      {o.rotulo}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {carregando ? (
            <ul className="mt-4 grid gap-3 @2xl:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <li
                  key={i}
                  className="h-32 animate-pulse motion-reduce:animate-none"
                  style={{
                    background: "var(--ms-surface)",
                    borderRadius: "var(--ms-radius)",
                    border: "1px solid var(--ms-border)",
                  }}
                />
              ))}
            </ul>
          ) : lista.length === 0 ? (
            <div
              className="mt-6 px-4 py-10 text-center"
              style={{
                border: "1px dashed var(--ms-border)",
                borderRadius: "var(--ms-radius)",
              }}
            >
              <p className="text-sm font-semibold">
                {catalogoVazio ? "Cardápio em preparação" : "Nenhum item encontrado"}
              </p>
              <p className="mt-1 text-xs opacity-70">
                {catalogoVazio
                  ? "Os itens ainda não foram cadastrados. Fale com o estabelecimento para conhecer as opções."
                  : "Ajuste a busca, a categoria ou os filtros para ver mais opções."}
              </p>
            </div>
          ) : (
            <ul
              className={`mt-4 grid gap-5 ${previewEstreita ? "grid-cols-1" : "@2xl:grid-cols-2 @5xl:grid-cols-3"}`}
            >
              {Array.from(new Set(lista.map((produto) => produto.categoria || "Geral"))).map(
                (categoria) => (
                  <li key={categoria} className="contents">
                    <h2 className="col-span-full text-sm font-semibold opacity-80">{categoria}</h2>
                    {lista
                      .filter((produto) => (produto.categoria || "Geral") === categoria)
                      .map((p) => (
                        <div key={p.id}>
                          <CartaoProduto
                            site={site}
                            produto={p}
                            compacto={previewEstreita}
                            quantidade={carrinho[p.id]?.quantidade ?? 0}
                            onAbrir={() => setDetalhe(p)}
                            onAlterar={(d, origem) => alterar(p, d, undefined, origem)}
                          />
                        </div>
                      ))}
                  </li>
                ),
              )}
            </ul>
          )}
        </main>
      </div>

      {site.mostrarAssinaturaNexa !== false && (
        <footer
          className="mx-auto w-full max-w-7xl px-4 pb-28 text-center text-xs opacity-60 @5xl:pb-8"
          style={{ color: site.aparencia.corTexto }}
        >
          Criado com Nexa
        </footer>
      )}

      {mostrarCarrinhoFlutuante && quantidadeTotal > 0 && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4 @5xl:hidden"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <button
            ref={carrinhoFlutuanteRef}
            type="button"
            onClick={() => setCarrinhoAberto(true)}
            className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold shadow-lg transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none ${
              contadorAnimado ? "scale-[1.02]" : "scale-100"
            }`}
            style={{ ...botaoPrimario, outlineColor: primaria }}
          >
            <span className="inline-flex items-center gap-2">
              <ShoppingBag size={16} aria-hidden />
              {quantidadeTotal} {quantidadeTotal === 1 ? "item" : "itens"}
            </span>
            <span>{moeda(totais.total)}</span>
          </button>
        </div>
      )}

      {detalhe && (
        <DetalheProduto
          site={site}
          produto={detalhe}
          quantidade={carrinho[detalhe.id]?.quantidade ?? 0}
          observacao={carrinho[detalhe.id]?.observacao ?? ""}
          onObservacao={(v) => definirObservacao(detalhe.id, v)}
          onAlterar={(d, obs) => alterar(detalhe, d, obs)}
          onFechar={() => setDetalhe(null)}
        />
      )}

      {produtoAnimado && (
        <div
          aria-hidden
          className="nexa-produto-voando fixed z-50 overflow-hidden rounded-lg shadow-lg"
          style={
            {
              left: produtoAnimado.inicioX,
              top: produtoAnimado.inicioY,
              "--nexa-voo-x": `${produtoAnimado.destinoX}px`,
              "--nexa-voo-y": `${produtoAnimado.destinoY}px`,
            } as CSSProperties
          }
        >
          <img src={produtoAnimado.imagem} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      {destaqueAberto && destaque?.imagem && (
        <DestaqueAbertura
          site={site}
          destaque={destaque}
          onAbrirProduto={(produto) => setDetalhe(produto)}
          onAbrirCategoria={(novaCategoria) => setCategoria(novaCategoria)}
          onFechar={() => {
            try {
              window.sessionStorage.setItem(`nexa:menu-highlight:${site.slug}`, "1");
            } catch {
              // Sem sessionStorage, o destaque pode reaparecer numa nova página.
            }
            setDestaqueAberto(false);
          }}
        />
      )}

      {pedidosAbertos && (
        <DrawerMeusPedidos
          site={site}
          pedidos={meusPedidos}
          atualizando={atualizandoPedidos}
          onAtualizar={() => void atualizarMeusPedidos()}
          onFechar={() => setPedidosAbertos(false)}
        />
      )}

      {carrinhoAberto && (
        <DrawerCarrinho site={site} onFechar={() => setCarrinhoAberto(false)}>
          <PainelCarrinho
            site={site}
            itens={itens}
            totais={totais}
            entrega={entrega}
            setEntrega={setEntrega}
            pagamento={pagamento}
            setPagamento={setPagamento}
            campos={campos}
            setCampos={setCampos}
            onAlterar={(id, d) => {
              const p = produtosPublicos.find((x) => x.id === id);
              if (p) alterar(p, d);
            }}
            pedidosAtivos={interacoesExternas}
            enviando={enviandoPedido}
            retorno={retornoPedido}
            onEnviar={() => void confirmarPedido()}
          />
        </DrawerCarrinho>
      )}
    </div>
  );
}

function rotuloStatusPedido(status: string) {
  const rotulos: Record<string, string> = {
    novo: "Pedido confirmado",
    aceito: "Pedido aceito",
    preparo: "Em preparo",
    pronto: "Pronto para retirada",
    em_rota: "Saiu para entrega",
    concluido: "Pedido concluído",
    cancelado: "Pedido cancelado",
  };
  return rotulos[status] ?? "Pedido recebido";
}

function DrawerMeusPedidos({
  site,
  pedidos,
  atualizando,
  onAtualizar,
  onFechar,
}: {
  site: Site;
  pedidos: PedidoPublico[];
  atualizando: boolean;
  onAtualizar: () => void;
  onFechar: () => void;
}) {
  const ref = useFocoModal(true, onFechar);
  const primaria = site.aparencia.corPrimaria;
  const [avaliando, setAvaliando] = useState<string | null>(null);
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const enviarAvaliacao = async (pedido: PedidoPublico) => {
    setEnviando(true);
    setMensagem("");
    try {
      await avaliarPedidoPublicado(site.slug, pedido.trackingToken, nota, comentario);
      setMensagem("Obrigado! Sua avaliação foi enviada para moderação.");
      setAvaliando(null);
      setComentario("");
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : "Não foi possível enviar a avaliação.");
    } finally {
      setEnviando(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-0 @md:place-items-center @md:p-5">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onFechar}
        className="absolute inset-0"
      />
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Meus pedidos"
        className="scrollbar-invisivel relative max-h-[88dvh] w-full max-w-lg overflow-y-auto p-5 shadow-2xl"
        style={{
          background: site.aparencia.corFundo,
          color: site.aparencia.corTexto,
          borderRadius: "18px 18px 0 0",
          border: "1px solid var(--ms-border)",
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Meus pedidos</h2>
            <p className="text-xs opacity-70">
              Acompanhe apenas os pedidos feitos neste navegador.
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar meus pedidos"
            className="grid h-11 w-11 place-items-center focus-visible:outline focus-visible:outline-2"
            style={{ outlineColor: primaria }}
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={onAtualizar}
            disabled={atualizando}
            className="min-h-11 px-3 text-xs font-semibold focus-visible:outline focus-visible:outline-2"
            style={{
              border: "1px solid var(--ms-border)",
              borderRadius: "var(--ms-radius)",
              outlineColor: primaria,
            }}
          >
            {atualizando ? "Atualizando…" : "Atualizar status"}
          </button>
        </div>
        {pedidos.length === 0 ? (
          <p
            className="rounded-xl border border-dashed p-4 text-sm opacity-75"
            style={{ borderColor: "var(--ms-border)" }}
          >
            Nenhum pedido para acompanhar neste dispositivo ainda.
          </p>
        ) : (
          <ul className="space-y-3">
            {pedidos.map((pedido) => (
              <li
                key={pedido.id}
                className="rounded-xl border p-4"
                style={{ borderColor: "var(--ms-border)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">Pedido #{pedido.codigo}</p>
                    <p className="mt-1 text-xs opacity-70">
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(pedido.createdAt))}{" "}
                      · {rotulosModalidade[pedido.modalidade]}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-bold"
                    style={{ background: hexToRgba(primaria, 0.16), color: primaria }}
                  >
                    {rotuloStatusPedido(pedido.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm opacity-80">
                  {pedido.itens.map((item) => `${item.quantidade}× ${item.nome}`).join(", ")}
                </p>
                <p className="mt-2 text-sm font-semibold">Total {moeda(Number(pedido.total))}</p>
                {pedido.status === "concluido" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setAvaliando((atual) => (atual === pedido.id ? null : pedido.id));
                        setMensagem("");
                      }}
                      className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2"
                      style={{ outlineColor: primaria }}
                    >
                      <Star size={14} aria-hidden /> Avaliar atendimento
                    </button>
                    {avaliando === pedido.id && (
                      <div
                        className="mt-3 border-t pt-3"
                        style={{ borderColor: "var(--ms-border)" }}
                      >
                        <p className="text-xs font-semibold">Como foi sua experiência?</p>
                        <div
                          className="mt-2 flex gap-1"
                          role="radiogroup"
                          aria-label="Nota da avaliação"
                        >
                          {[1, 2, 3, 4, 5].map((valor) => (
                            <button
                              key={valor}
                              type="button"
                              role="radio"
                              aria-checked={nota === valor}
                              aria-label={`${valor} estrela${valor > 1 ? "s" : ""}`}
                              onClick={() => setNota(valor)}
                              className="grid h-11 w-11 place-items-center focus-visible:outline focus-visible:outline-2"
                              style={{
                                color: valor <= nota ? primaria : "inherit",
                                outlineColor: primaria,
                              }}
                            >
                              <Star
                                size={18}
                                fill={valor <= nota ? "currentColor" : "none"}
                                aria-hidden
                              />
                            </button>
                          ))}
                        </div>
                        <label className="mt-2 block text-xs">
                          Comentário opcional
                          <textarea
                            value={comentario}
                            maxLength={800}
                            onChange={(event) => setComentario(event.target.value)}
                            rows={2}
                            className="mt-1 w-full p-2 text-sm"
                            style={{
                              border: "1px solid var(--ms-border)",
                              borderRadius: "var(--ms-radius)",
                              background: "transparent",
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          disabled={enviando}
                          onClick={() => void enviarAvaliacao(pedido)}
                          className="mt-2 min-h-11 px-3 text-xs font-semibold"
                          style={{
                            background: primaria,
                            color: contraste(primaria),
                            borderRadius: "var(--ms-radius)",
                          }}
                        >
                          {enviando ? "Enviando…" : "Enviar avaliação"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {mensagem && (
          <p role="status" className="mt-3 text-xs font-medium">
            {mensagem}
          </p>
        )}
      </section>
    </div>
  );
}

function DestaqueAbertura({
  site,
  destaque,
  onAbrirProduto,
  onAbrirCategoria,
  onFechar,
}: {
  site: Site;
  destaque: NonNullable<NonNullable<Site["comercio"]>["destaqueAbertura"]>;
  onAbrirProduto: (produto: Produto) => void;
  onAbrirCategoria: (categoria: string) => void;
  onFechar: () => void;
}) {
  const ref = useFocoModal(true, onFechar);
  const primaria = site.aparencia.corPrimaria;
  const [inicio, setInicio] = useState<number | null>(null);
  const produto = site.produtos.find((item) => item.id === destaque.produtoId);
  const temDestino = Boolean(produto || destaque.categoria);
  const abrir = () => {
    if (produto) onAbrirProduto(produto);
    else if (destaque.categoria) onAbrirCategoria(destaque.categoria);
    onFechar();
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onFechar}
        className="absolute inset-0"
      />
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-destaque-cardapio"
        aria-describedby="legenda-destaque-cardapio"
        onPointerDown={(event) => setInicio(event.clientY)}
        onPointerUp={(event) => {
          if (inicio !== null && event.clientY - inicio > 80) onFechar();
          setInicio(null);
        }}
        className="relative w-full max-w-sm overflow-hidden shadow-2xl"
        style={{
          background: site.aparencia.corFundo,
          color: site.aparencia.corTexto,
          borderRadius: "var(--ms-radius)",
          border: "1px solid var(--ms-border)",
        }}
      >
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar destaque"
          className="absolute right-2 top-2 z-10 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white focus-visible:outline focus-visible:outline-2"
          style={{ outlineColor: primaria }}
        >
          <X size={18} aria-hidden />
        </button>
        <img
          src={destaque.imagem}
          alt={destaque.titulo || `Destaque de ${site.conteudo.nome}`}
          className="h-52 w-full object-cover"
        />
        <div className="p-5">
          <p
            className="text-xs font-semibold uppercase tracking-[0.16em]"
            style={{ color: primaria }}
          >
            Destaque do dia
          </p>
          <h2 id="titulo-destaque-cardapio" className="mt-1 text-xl font-bold">
            {destaque.titulo || "Confira nossa novidade"}
          </h2>
          {destaque.legenda && (
            <p id="legenda-destaque-cardapio" className="mt-2 text-sm opacity-80">
              {destaque.legenda}
            </p>
          )}
          {temDestino && (
            <button
              type="button"
              onClick={abrir}
              className="mt-4 min-h-11 w-full px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2"
              style={{
                background: primaria,
                color: contraste(primaria),
                borderRadius: site.aparencia.botao === "pill" ? "999px" : "var(--ms-radius)",
                outlineColor: primaria,
              }}
            >
              Ver agora
            </button>
          )}
          <p className="mt-3 text-center text-[11px] opacity-60">
            Deslize para baixo ou toque no X para fechar.
          </p>
        </div>
      </section>
    </div>
  );
}

/** Carrinho sob demanda: ocupa a lateral no desktop e sobe no celular. */
function DrawerCarrinho({
  site,
  onFechar,
  children,
}: {
  site: Site;
  onFechar: () => void;
  children: React.ReactNode;
}) {
  const ref = useFocoModal(true, onFechar);
  const primaria = site.aparencia.corPrimaria;
  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onFechar}
        className="absolute inset-0 bg-black/50"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Seu pedido"
        className="scrollbar-invisivel absolute inset-x-0 bottom-0 max-h-[88vh] touch-pan-y overflow-y-auto p-4 shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-bottom @5xl:inset-y-0 @5xl:left-auto @5xl:right-0 @5xl:max-h-none @5xl:w-[min(440px,100vw)] @5xl:border-l @5xl:border-t-0"
        style={{
          background: site.aparencia.corFundo,
          color: site.aparencia.corTexto,
          borderTopLeftRadius: "18px",
          borderTopRightRadius: "18px",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Seu pedido</h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar carrinho"
            className="grid h-11 w-11 place-items-center focus-visible:outline focus-visible:outline-2"
            style={{ outlineColor: primaria }}
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Chip({
  children,
  ativo,
  cor,
  onClick,
}: {
  children: React.ReactNode;
  ativo: boolean;
  cor: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className="min-h-11 shrink-0 whitespace-nowrap px-4 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none"
      style={{
        borderRadius: "999px",
        border: `1px solid ${ativo ? cor : "var(--ms-border)"}`,
        background: ativo ? cor : "transparent",
        color: ativo ? contraste(cor) : "inherit",
        outlineColor: cor,
      }}
    >
      {children}
    </button>
  );
}

/**
 * Fila de chips navegável por toque e também por clique + arraste no desktop.
 * Isso mantém os últimos filtros acessíveis dentro da prévia escalada.
 */
function FaixaRolavel({ ariaLabel, children }: { ariaLabel: string; children: React.ReactNode }) {
  const faixaRef = useRef<HTMLDivElement>(null);
  const inicioRef = useRef<{ x: number; scroll: number } | null>(null);

  return (
    <div
      ref={faixaRef}
      role="group"
      aria-label={ariaLabel}
      onPointerDown={(event) => {
        const faixa = faixaRef.current;
        if (!faixa || faixa.scrollWidth <= faixa.clientWidth) return;
        inicioRef.current = { x: event.clientX, scroll: faixa.scrollLeft };
        faixa.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const faixa = faixaRef.current;
        const inicio = inicioRef.current;
        if (!faixa || !inicio) return;
        faixa.scrollLeft = inicio.scroll - (event.clientX - inicio.x);
      }}
      onPointerUp={(event) => {
        inicioRef.current = null;
        if (faixaRef.current?.hasPointerCapture(event.pointerId)) {
          faixaRef.current.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={() => {
        inicioRef.current = null;
      }}
      className="-mx-1 flex cursor-grab gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 scrollbar-invisivel active:cursor-grabbing"
      style={{ touchAction: "pan-x" }}
    >
      {children}
    </div>
  );
}

function CartaoProduto({
  site,
  produto,
  compacto = false,
  quantidade,
  onAbrir,
  onAlterar,
}: {
  site: Site;
  produto: Produto;
  /** Prévia lateral: evita comprimir foto, texto e CTA em uma linha estreita. */
  compacto?: boolean;
  quantidade: number;
  onAbrir: () => void;
  onAlterar: (delta: number, origem?: HTMLElement) => void;
}) {
  const primaria = site.aparencia.corPrimaria;
  const desconto = descontoPercentual(produto);
  const disponivelAgora = produtoDisponivelAgora(produto);
  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{
        background: "var(--ms-surface)",
        border: "1px solid var(--ms-border)",
        borderRadius: "var(--ms-radius)",
        opacity: disponivelAgora ? 1 : 0.72,
      }}
    >
      <button
        type="button"
        onClick={onAbrir}
        className={`flex flex-1 p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 ${
          compacto ? "flex-col gap-2" : "gap-3"
        }`}
        style={{ outlineColor: primaria }}
        aria-label={`Ver detalhes de ${produto.nome}`}
      >
        {produto.imagem && (
          <img
            src={produto.imagem}
            alt=""
            loading="lazy"
            className={`shrink-0 rounded-lg object-cover ${compacto ? "h-24 w-full" : "h-24 w-24"}`}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {produto.categoria && (
              <span className="text-[10px] uppercase tracking-wide opacity-60">
                {produto.categoria}
              </span>
            )}
            {produto.destaque && <Badge cor={primaria}>Mais pedido</Badge>}
            {desconto > 0 && <Badge cor={primaria}>Promoção −{desconto}%</Badge>}
            {!disponivelAgora && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: "var(--ms-border)" }}
              >
                Indisponível
              </span>
            )}
          </div>
          <h3 className="mt-1 text-sm font-semibold">{produto.nome}</h3>
          {produto.descricao && (
            <p className="mt-1 line-clamp-2 text-xs opacity-70">{produto.descricao}</p>
          )}
          <span className="mt-1 inline-block text-[11px] font-semibold underline underline-offset-2 opacity-70">
            Ver item
          </span>
          {(produto.preco > 0 || produto.precoPromocional) && (
            <p className="mt-2 flex flex-wrap items-center gap-2">
              {produto.precoPromocional ? (
                <>
                  <span className="text-xs line-through opacity-50">{moeda(produto.preco)}</span>
                  <span className="text-sm font-bold" style={{ color: primaria }}>
                    {moeda(produto.precoPromocional)}
                  </span>
                </>
              ) : (
                <span className="text-sm font-bold">{moeda(produto.preco)}</span>
              )}
            </p>
          )}
        </div>
      </button>
      <div className="px-3 pb-3">
        {disponivelAgora ? (
          <Contador
            site={site}
            quantidade={quantidade}
            rotulo={produto.nome}
            onAlterar={onAlterar}
            onAdicionar={(origem) => onAlterar(1, origem)}
          />
        ) : (
          <button
            type="button"
            disabled
            className="min-h-11 w-full text-xs font-semibold opacity-60"
            style={{ border: "1px solid var(--ms-border)", borderRadius: "var(--ms-radius)" }}
          >
            Indisponível no momento
          </button>
        )}
      </div>
    </div>
  );
}

function Badge({ children, cor }: { children: React.ReactNode; cor: string }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ background: hexToRgba(cor, 0.18), color: cor }}
    >
      {children}
    </span>
  );
}

function Contador({
  site,
  quantidade,
  rotulo,
  onAlterar,
  onAdicionar,
}: {
  site: Site;
  quantidade: number;
  rotulo: string;
  onAlterar: (delta: number, origem?: HTMLElement) => void;
  onAdicionar: (origem?: HTMLElement) => void;
}) {
  const primaria = site.aparencia.corPrimaria;
  const radius = site.aparencia.botao === "pill" ? "999px" : "var(--ms-radius)";
  if (quantidade === 0)
    return (
      <button
        type="button"
        onClick={(event) => onAdicionar(event.currentTarget)}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 text-sm font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
        style={{
          background: primaria,
          color: contraste(primaria),
          borderRadius: radius,
          outlineColor: primaria,
        }}
      >
        <Plus size={15} aria-hidden /> Adicionar ao carrinho
      </button>
    );
  return (
    <div
      className="flex items-center justify-between"
      style={{ border: `1px solid ${primaria}`, borderRadius: radius }}
    >
      <button
        type="button"
        aria-label={`Remover uma unidade de ${rotulo}`}
        onClick={() => onAlterar(-1)}
        className="grid h-11 w-11 place-items-center focus-visible:outline focus-visible:outline-2"
        style={{ outlineColor: primaria }}
      >
        <Minus size={15} aria-hidden />
      </button>
      <span aria-live="polite" className="text-sm font-semibold">
        {quantidade}
      </span>
      <button
        type="button"
        aria-label={`Adicionar uma unidade de ${rotulo}`}
        onClick={(event) => onAlterar(1, event.currentTarget)}
        className="grid h-11 w-11 place-items-center focus-visible:outline focus-visible:outline-2"
        style={{ outlineColor: primaria }}
      >
        <Plus size={15} aria-hidden />
      </button>
    </div>
  );
}

function DetalheProduto({
  site,
  produto,
  quantidade,
  observacao,
  onObservacao,
  onAlterar,
  onFechar,
}: {
  site: Site;
  produto: Produto;
  quantidade: number;
  observacao: string;
  onObservacao: (v: string) => void;
  onAlterar: (delta: number, observacao?: string) => void;
  onFechar: () => void;
}) {
  const perfil = perfilCatalogo(site);
  const primaria = site.aparencia.corPrimaria;
  const [nota, setNota] = useState(observacao);
  const desconto = descontoPercentual(produto);
  const disponivelAgora = produtoDisponivelAgora(produto);

  const refModal = useFocoModal(true, onFechar);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center @2xl:items-center">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onFechar}
        className="absolute inset-0 bg-black/50"
      />
      <div
        ref={refModal}
        role="dialog"
        aria-modal="true"
        aria-label={produto.nome}
        className="scrollbar-invisivel relative max-h-[92vh] w-full max-w-lg overflow-y-auto p-4 @2xl:rounded-2xl"
        style={{
          background: site.aparencia.corFundo,
          color: site.aparencia.corTexto,
          borderTopLeftRadius: "18px",
          borderTopRightRadius: "18px",
        }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-lg font-semibold">{produto.nome}</h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar detalhes do item"
            className="grid h-11 w-11 shrink-0 place-items-center focus-visible:outline focus-visible:outline-2"
            style={{ outlineColor: primaria }}
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {produto.imagem && (
          <img
            src={produto.imagem}
            alt={produto.nome}
            className="mb-3 h-48 w-full rounded-xl object-cover"
          />
        )}

        <div className="flex flex-wrap items-center gap-2">
          {produto.categoria && <Badge cor={primaria}>{produto.categoria}</Badge>}
          {desconto > 0 && <Badge cor={primaria}>−{desconto}%</Badge>}
          {!disponivelAgora && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ background: "var(--ms-border)" }}
            >
              Indisponível
            </span>
          )}
        </div>

        {produto.descricao && <p className="mt-2 text-sm opacity-80">{produto.descricao}</p>}

        <p className="mt-3 flex items-center gap-2">
          {produto.precoPromocional ? (
            <>
              <span className="text-sm line-through opacity-50">{moeda(produto.preco)}</span>
              <span className="text-xl font-bold" style={{ color: primaria }}>
                {moeda(produto.precoPromocional)}
              </span>
            </>
          ) : (
            <span className="text-xl font-bold">{moeda(produto.preco)}</span>
          )}
        </p>

        <section
          className="mt-4 p-3"
          style={{
            background: "var(--ms-surface)",
            border: "1px solid var(--ms-border)",
            borderRadius: "var(--ms-radius)",
          }}
        >
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <Info size={14} aria-hidden /> Opções do item
          </h3>
          {produto.variacoes.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {produto.variacoes.map((v) => (
                <li
                  key={v}
                  className="rounded-full px-3 py-1.5 text-xs"
                  style={{ border: "1px solid var(--ms-border)" }}
                >
                  {v}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs opacity-70">
              Opções disponíveis conforme o cardápio do estabelecimento.
            </p>
          )}
          <p className="mt-3 text-[11px] uppercase tracking-wide opacity-60">
            Personalizações combinadas no WhatsApp
          </p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {perfil.gruposOpcao.map((g) => (
              <li
                key={g}
                className="rounded-full px-2.5 py-1 text-[11px] opacity-75"
                style={{ border: "1px dashed var(--ms-border)" }}
              >
                {g}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] opacity-70">
            Estas escolhas ainda não são registradas automaticamente: descreva na observação abaixo
            e confirme com o estabelecimento.
          </p>
        </section>

        <label className="mt-4 block text-sm font-medium" htmlFor="obs-item">
          Observação
        </label>
        <textarea
          id="obs-item"
          value={nota}
          onChange={(e) => {
            setNota(e.target.value);
            onObservacao(e.target.value);
          }}
          rows={3}
          placeholder="Ex.: sem cebola, ponto da carne, meio a meio…"
          className="mt-1 w-full bg-transparent p-3 text-sm outline-none focus-visible:outline focus-visible:outline-2"
          style={{
            border: "1px solid var(--ms-border)",
            borderRadius: "var(--ms-radius)",
            outlineColor: primaria,
          }}
        />

        <div className="mt-4 flex flex-col gap-2 @2xl:flex-row @2xl:items-center">
          <div className="@2xl:w-40">
            {disponivelAgora ? (
              <Contador
                site={site}
                quantidade={quantidade}
                rotulo={produto.nome}
                onAlterar={(d) => onAlterar(d, nota)}
                onAdicionar={() => onAlterar(1, nota)}
              />
            ) : (
              <p className="min-h-11 py-2 text-center text-xs font-semibold opacity-70">
                Indisponível agora
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="min-h-11 flex-1 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              border: "1px solid var(--ms-border)",
              borderRadius: "var(--ms-radius)",
              outlineColor: primaria,
            }}
          >
            {quantidade > 0 ? "Continuar escolhendo" : "Fechar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PainelCarrinho({
  site,
  itens,
  totais,
  entrega,
  setEntrega,
  pagamento,
  setPagamento,
  campos,
  setCampos,
  onAlterar,
  pedidosAtivos,
  enviando,
  retorno,
  onEnviar,
}: {
  site: Site;
  itens: ItemCarrinho[];
  totais: ReturnType<typeof totaisCarrinho>;
  entrega: Entrega;
  setEntrega: (e: Entrega) => void;
  pagamento: Pagamento | undefined;
  setPagamento: (p: Pagamento) => void;
  campos: CamposEntrega;
  setCampos: React.Dispatch<React.SetStateAction<CamposEntrega>>;
  onAlterar: (id: string, delta: number) => void;
  pedidosAtivos: boolean;
  enviando: boolean;
  retorno: string;
  onEnviar: () => void;
}) {
  const primaria = site.aparencia.corPrimaria;
  const modalidades: Entrega[] = perfilCatalogo(site).modalidades ?? ["entrega", "retirada"];
  const contatoValido = whatsappValido(campos.whatsapp);
  const dadosObrigatoriosOk = contatoValido && campos.nome.trim().length >= 2;
  const podeConfirmar = pedidosAtivos && dadosObrigatoriosOk && !enviando;
  const campo = (nome: keyof CamposEntrega, rotulo: string, placeholder = "") => (
    <label className="block text-xs font-medium opacity-80">
      {rotulo}
      <input
        value={campos[nome] ?? ""}
        onChange={(e) => setCampos((c) => ({ ...c, [nome]: e.target.value }))}
        placeholder={placeholder}
        className="mt-1 min-h-11 w-full bg-transparent px-3 text-sm outline-none focus-visible:outline focus-visible:outline-2"
        style={{
          border: "1px solid var(--ms-border)",
          borderRadius: "var(--ms-radius)",
          outlineColor: primaria,
        }}
      />
    </label>
  );

  const campoWhatsapp = (
    <label className="block text-xs font-medium opacity-80">
      WhatsApp para contato
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        value={formatarTelefonePedido(campos.whatsapp)}
        onChange={(e) =>
          setCampos((c) => ({
            ...c,
            whatsapp: e.target.value
              .replace(/\D/g, "")
              .replace(/^55(?=\d{10,11}$)/, "")
              .slice(0, 11),
          }))
        }
        maxLength={15}
        placeholder="(00) 00000-0000"
        aria-invalid={Boolean(campos.whatsapp) && !contatoValido}
        aria-describedby="aviso-whatsapp-pedido"
        className="mt-1 min-h-11 w-full bg-transparent px-3 text-sm outline-none focus-visible:outline focus-visible:outline-2"
        style={{
          border: "1px solid var(--ms-border)",
          borderRadius: "var(--ms-radius)",
          outlineColor: primaria,
        }}
      />
      <span id="aviso-whatsapp-pedido" className="mt-1 block text-[11px] opacity-70">
        {campos.whatsapp && !contatoValido
          ? "Informe um WhatsApp válido com DDD."
          : "Informe seu WhatsApp com DDD."}
      </span>
    </label>
  );

  if (itens.length === 0)
    return (
      <div
        className="p-5 text-center"
        style={{
          background: "var(--ms-surface)",
          border: "1px dashed var(--ms-border)",
          borderRadius: "var(--ms-radius)",
        }}
      >
        <ShoppingBag size={20} className="mx-auto opacity-60" aria-hidden />
        <p className="mt-2 text-sm font-semibold">Seu pedido está vazio</p>
        <p className="mt-1 text-xs opacity-70">
          Toque em um item do {perfilCatalogo(site).rotulo.toLowerCase()} para adicionar.
        </p>
      </div>
    );

  return (
    <div
      className="flex flex-col gap-3 p-4"
      style={{
        background: "var(--ms-surface)",
        border: "1px solid var(--ms-border)",
        borderRadius: "var(--ms-radius)",
      }}
    >
      <h2 className="text-sm font-semibold">Seu pedido</h2>
      <ul className="flex flex-col gap-3">
        {itens.map((i) => (
          <li key={i.produtoId} className="flex flex-col gap-1.5">
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 text-sm">
                {i.quantidade}x {i.nome}
              </span>
              <span className="shrink-0 text-sm font-semibold">
                {moeda(i.preco * i.quantidade)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`Remover uma unidade de ${i.nome}`}
                onClick={() => onAlterar(i.produtoId, -1)}
                className="grid h-11 w-11 place-items-center focus-visible:outline focus-visible:outline-2"
                style={{
                  border: "1px solid var(--ms-border)",
                  borderRadius: "var(--ms-radius)",
                  outlineColor: primaria,
                }}
              >
                <Minus size={14} aria-hidden />
              </button>
              <button
                type="button"
                aria-label={`Adicionar uma unidade de ${i.nome}`}
                onClick={() => onAlterar(i.produtoId, 1)}
                className="grid h-11 w-11 place-items-center focus-visible:outline focus-visible:outline-2"
                style={{
                  border: "1px solid var(--ms-border)",
                  borderRadius: "var(--ms-radius)",
                  outlineColor: primaria,
                }}
              >
                <Plus size={14} aria-hidden />
              </button>
              <button
                type="button"
                aria-label={`Remover ${i.nome} do pedido`}
                onClick={() => onAlterar(i.produtoId, -i.quantidade)}
                className="grid h-11 w-11 place-items-center focus-visible:outline focus-visible:outline-2"
                style={{
                  border: "1px solid var(--ms-border)",
                  borderRadius: "var(--ms-radius)",
                  outlineColor: primaria,
                }}
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </div>
            {i.observacao && <p className="text-xs opacity-70">Item: {i.observacao}</p>}
          </li>
        ))}
      </ul>

      <div
        role="group"
        aria-label="Modalidade do pedido"
        className="-mx-1 flex gap-2 overflow-x-auto scrollbar-invisivel px-1"
      >
        {modalidades.map((op) => (
          <Chip key={op} ativo={entrega === op} cor={primaria} onClick={() => setEntrega(op)}>
            {rotulosModalidade[op]}
          </Chip>
        ))}
      </div>

      <div className="grid gap-2">
        {campo("nome", "Seu nome")}
        {campoWhatsapp}
      </div>

      {entrega === "mesa" && (
        <div className="grid gap-2 @2xl:grid-cols-2">
          {campo("mesa", "Número da mesa", "Ex.: 12")}
          {campo("pessoas", "Quantas pessoas?", "Ex.: 4")}
          <div className="@2xl:col-span-2">{campo("observacao", "Observações do pedido")}</div>
        </div>
      )}

      {entrega === "retirada" && (
        <div className="grid gap-2">
          {campo("horarioPreferido", "Horário preferido para retirar", "Ex.: 19h30")}
          {campo("observacao", "Observações do pedido")}
        </div>
      )}

      {entrega === "entrega" && (
        <div className="grid gap-2">
          {campo("endereco", "Endereço", "Rua e número")}
          {campo("bairro", "Bairro")}
          {campo("complemento", "Complemento", "Apto, bloco…")}
          {campo("referencia", "Referência")}
          {campo("observacao", "Observações do pedido")}
          {(site.comercio?.taxaEntrega ?? 0) === 0 && (
            <p className="text-[11px] opacity-70">
              Taxa de entrega não cadastrada: confirme o valor com o estabelecimento.
            </p>
          )}
        </div>
      )}

      <div role="group" aria-label="Forma de pagamento" className="flex flex-wrap gap-2">
        {(site.comercio?.pagamentosAceitos?.length
          ? site.comercio.pagamentosAceitos
          : (Object.keys(rotulosPagamento) as Pagamento[])
        ).map((p) => (
          <Chip key={p} ativo={pagamento === p} cor={primaria} onClick={() => setPagamento(p)}>
            {rotulosPagamento[p]}
          </Chip>
        ))}
      </div>
      {pagamento === "dinheiro" && campo("troco", "Troco para quanto?", "Ex.: R$ 100,00")}
      {pagamento === "pix" && site.comercio?.pixChave && (
        <div className="rounded-xl border p-3 text-xs" style={{ borderColor: "var(--ms-border)" }}>
          <p className="font-semibold">
            Pix para {site.comercio.pixFavorecido || site.conteudo.nome}
          </p>
          <p className="mt-1 break-all opacity-80">Chave: {site.comercio.pixChave}</p>
          {site.comercio.pixQrCode && (
            <img
              src={site.comercio.pixQrCode}
              alt="QR Code Pix do estabelecimento"
              className="mt-2 h-32 w-32 object-contain"
            />
          )}
        </div>
      )}
      {pagamento === "balcao" && (
        <p className="rounded-xl border p-3 text-xs" style={{ borderColor: "var(--ms-border)" }}>
          Pague diretamente no balcão ou com a equipe do estabelecimento. A Nexa não processa este
          pagamento.
        </p>
      )}

      <dl
        className="flex flex-col gap-1 border-t pt-2 text-sm"
        style={{ borderColor: "var(--ms-border)" }}
      >
        <div className="flex justify-between">
          <dt className="opacity-75">Subtotal</dt>
          <dd>{moeda(totais.subtotal)}</dd>
        </div>
        {totais.taxa > 0 && (
          <div className="flex justify-between">
            <dt className="opacity-75">Taxa de entrega</dt>
            <dd>{moeda(totais.taxa)}</dd>
          </div>
        )}
        <div className="flex justify-between text-base font-bold">
          <dt>Total</dt>
          <dd style={{ color: primaria }}>{moeda(totais.total)}</dd>
        </div>
      </dl>

      {retorno && (
        <p role="status" className="text-xs font-medium">
          {retorno}
        </p>
      )}
      {pedidosAtivos && !enviando && !dadosObrigatoriosOk && (
        <p role="status" className="text-xs opacity-75">
          Informe seu nome e um WhatsApp válido com DDD para confirmar.
        </p>
      )}
      {!pedidosAtivos && !retorno && (
        <p className="text-xs opacity-75">
          Esta é uma prévia. A confirmação de pedidos fica disponível no cardápio publicado.
        </p>
      )}
      {totais.abaixoDoMinimo ? (
        <p className="text-xs opacity-75">
          Pedido mínimo de {moeda(totais.minimo)} para enviar pelo WhatsApp.
        </p>
      ) : (
        <button
          type="button"
          disabled={!podeConfirmar}
          onClick={onEnviar}
          className="inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            background: primaria,
            color: contraste(primaria),
            borderRadius: site.aparencia.botao === "pill" ? "999px" : "var(--ms-radius)",
            outlineColor: primaria,
            opacity: podeConfirmar ? 1 : 0.65,
          }}
        >
          <ShoppingBag size={15} aria-hidden />{" "}
          {enviando
            ? "Confirmando pedido…"
            : pedidosAtivos
              ? "Confirmar pedido"
              : "Publique para receber pedidos"}
        </button>
      )}
      <p className="text-[11px] opacity-70">
        {entrega === "mesa"
          ? "Seu pedido será registrado para a equipe do estabelecimento."
          : "Seu pedido é registrado para a equipe. O pagamento é combinado diretamente com o estabelecimento."}
      </p>
    </div>
  );
}
