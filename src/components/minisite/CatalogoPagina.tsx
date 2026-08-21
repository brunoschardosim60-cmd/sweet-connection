import { useEffect, useMemo, useState } from "react";
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
  Trash2,
  X,
} from "lucide-react";
import { whatsappLink } from "@/lib/nexa/brand";
import { eventoMarketing } from "@/lib/nexa/rastreio-marketing";
import { registrarEventoPublicado } from "@/lib/nexa/public-api";
import { moeda } from "@/lib/nexa/utils";
import { contraste, estiloMiniSite, hexToRgba } from "@/components/minisite/estilo";
import { useFocoModal } from "@/components/minisite/useFocoModal";
import {
  categoriasDeProdutos,
  descontoPercentual,
  filtrarCatalogo,
  filtrosCatalogo,
  lerRascunhoPedido,
  mensagemPedido,
  ordenacoesCatalogo,
  ordenarCatalogo,
  perfilCatalogo,
  precoFinal,
  rotulosModalidade,
  rotulosPagamento,
  situacaoAtendimento,
  salvarRascunhoPedido,
  totaisCarrinho,
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

/**
 * Página pública de catálogo/cardápio do mini-site.
 * Usa apenas os produtos já cadastrados; nada é inventado ou salvo automaticamente.
 */
export function CatalogoPagina({
  site,
  rastrear = false,
  interacoesExternas = true,
  mostrarVoltar = true,
}: {
  site: Site;
  rastrear?: boolean;
  interacoesExternas?: boolean;
  /** Cardápios digitais usam esta página como entrada principal. */
  mostrarVoltar?: boolean;
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

  const registrar = (rotulo: string, whatsapp = false) => {
    if (rastrear)
      void registrarEventoPublicado(site.slug, whatsapp ? "whatsapp" : "clique", rotulo).catch(
        () => {},
      );
  };

  const categorias = useMemo(
    () => ["Todos", ...categoriasDeProdutos(site.produtos)],
    [site.produtos],
  );
  const lista = useMemo(
    () => ordenarCatalogo(filtrarCatalogo(site.produtos, { busca, categoria, filtro }), ordem),
    [site.produtos, busca, categoria, filtro, ordem],
  );

  const itens: ItemCarrinho[] = site.produtos
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

  const totais = totaisCarrinho(itens, site, entrega);
  const situacao = situacaoAtendimento(site);
  const quantidadeTotal = itens.reduce((t, i) => t + i.quantidade, 0);

  const alterar = (p: Produto, delta: number, observacao?: string) => {
    if (delta > 0) eventoMarketing("add_to_cart", { item_id: p.id, quantidade: delta });
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

  const mensagem = mensagemPedido(site, itens, entrega, {
    ...campos,
    ...(pagamento ? { pagamento } : {}),
  });
  const linkPedido = whatsappLink(site.conteudo.whatsapp, mensagem);

  const botaoPrimario = {
    background: primaria,
    color: contraste(primaria),
    borderRadius: site.aparencia.botao === "pill" ? "999px" : "var(--ms-radius)",
  };

  return (
    <div
      style={estiloMiniSite(site)}
      className="min-h-screen w-full overflow-x-hidden text-[15px] leading-relaxed"
    >
      <header
        className="sticky top-0 z-30 w-full backdrop-blur"
        style={{
          background: hexToRgba(site.aparencia.corFundo, 0.92),
          borderBottom: "1px solid var(--ms-border)",
        }}
      >
        <div className="mx-auto grid w-full max-w-5xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
          {mostrarVoltar ? (
            <a
              href={interacoesExternas ? `/site/${site.slug}` : undefined}
              aria-label="Voltar ao site"
              className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ outlineColor: primaria }}
            >
              <ArrowLeft size={16} aria-hidden />
              <span className="hidden sm:inline">Voltar ao site</span>
            </a>
          ) : (
            <span aria-hidden className="block w-2" />
          )}
          <div className="flex min-w-0 items-center gap-2">
            {site.conteudo.logo && (
              <img
                src={site.conteudo.logo}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{site.conteudo.nome}</p>
              <p className="truncate text-[11px] opacity-70">{perfil.rotulo}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCarrinhoAberto(true)}
            aria-label={`Abrir carrinho com ${quantidadeTotal} ${quantidadeTotal === 1 ? "item" : "itens"}`}
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              ...botaoPrimario,
              opacity: quantidadeTotal > 0 ? 1 : 0.85,
              outlineColor: primaria,
            }}
          >
            <ShoppingBag size={16} aria-hidden />
            <span aria-hidden>{quantidadeTotal}</span>
          </button>
        </div>

        <div
          className="mx-auto flex w-full max-w-5xl items-center gap-2 overflow-x-auto px-4 pb-2 text-[11px]"
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
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 opacity-80 focus-visible:outline focus-visible:outline-2"
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
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 opacity-80 focus-visible:outline focus-visible:outline-2"
              style={{ border: "1px solid var(--ms-border)", outlineColor: primaria }}
            >
              <MessageCircle size={12} aria-hidden /> WhatsApp
            </a>
          )}
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 pb-32 pt-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:pb-10">
        <main className="min-w-0">
          <h1 className="text-2xl font-semibold">{perfil.rotulo}</h1>
          <p className="mt-1 text-sm opacity-75">{perfil.apoio}</p>

          <div className="mt-4 flex flex-col gap-3">
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

            <div
              role="group"
              aria-label="Filtros do catálogo"
              className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
            >
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
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="ordem-catalogo" className="text-xs opacity-70">
                Ordenar por
              </label>
              <select
                id="ordem-catalogo"
                value={ordem}
                onChange={(e) => setOrdem(e.target.value as OrdemCatalogo)}
                className="min-h-11 bg-transparent px-3 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  border: "1px solid var(--ms-border)",
                  borderRadius: "999px",
                  color: "inherit",
                  outlineColor: primaria,
                }}
              >
                {ordenacoesCatalogo.map((o) => (
                  <option key={o.id} value={o.id} style={{ color: "#111" }}>
                    {o.rotulo}
                  </option>
                ))}
              </select>
            </div>

            {categorias.length > 1 && (
              <div
                role="group"
                aria-label="Categorias"
                className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
              >
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
              </div>
            )}

            <p aria-live="polite" className="text-xs opacity-70">
              {carregando
                ? "Carregando itens…"
                : `${lista.length} ${lista.length === 1 ? "item encontrado" : "itens encontrados"}`}
            </p>
          </div>

          {carregando ? (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
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
              <p className="text-sm font-semibold">Nenhum item encontrado</p>
              <p className="mt-1 text-xs opacity-70">
                Ajuste a busca, a categoria ou os filtros para ver mais opções.
              </p>
            </div>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {lista.map((p) => (
                <li key={p.id}>
                  <CartaoProduto
                    site={site}
                    produto={p}
                    quantidade={carrinho[p.id]?.quantidade ?? 0}
                    onAbrir={() => setDetalhe(p)}
                    onAlterar={(d) => alterar(p, d)}
                  />
                </li>
              ))}
            </ul>
          )}
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-20">
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
                const p = site.produtos.find((x) => x.id === id);
                if (p) alterar(p, d);
              }}
              onObservacao={definirObservacao}
              linkPedido={interacoesExternas ? linkPedido : undefined}
              onEnviar={() => {
                eventoMarketing("iniciar_checkout", { value: totais.total, currency: "BRL" });
                registrar("Catálogo: enviar pedido", true);
              }}
            />
          </div>
        </aside>
      </div>

      {quantidadeTotal > 0 && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4 lg:hidden"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={() => setCarrinhoAberto(true)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
              const p = site.produtos.find((x) => x.id === id);
              if (p) alterar(p, d);
            }}
            onObservacao={definirObservacao}
            linkPedido={interacoesExternas ? linkPedido : undefined}
            onEnviar={() => {
              eventoMarketing("iniciar_checkout", { value: totais.total, currency: "BRL" });
              registrar("Catálogo: enviar pedido", true);
            }}
          />
        </DrawerCarrinho>
      )}
    </div>
  );
}

/** Drawer do carrinho no celular, com foco preso e Escape para fechar. */
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
    <div className="fixed inset-0 z-40 lg:hidden">
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
        className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto p-4"
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

function CartaoProduto({
  site,
  produto,
  quantidade,
  onAbrir,
  onAlterar,
}: {
  site: Site;
  produto: Produto;
  quantidade: number;
  onAbrir: () => void;
  onAlterar: (delta: number) => void;
}) {
  const primaria = site.aparencia.corPrimaria;
  const desconto = descontoPercentual(produto);
  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{
        background: "var(--ms-surface)",
        border: "1px solid var(--ms-border)",
        borderRadius: "var(--ms-radius)",
        opacity: produto.disponivel ? 1 : 0.72,
      }}
    >
      <button
        type="button"
        onClick={onAbrir}
        className="flex flex-1 gap-3 p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2"
        style={{ outlineColor: primaria }}
        aria-label={`Ver detalhes de ${produto.nome}`}
      >
        {produto.imagem && (
          <img
            src={produto.imagem}
            alt=""
            loading="lazy"
            className="h-24 w-24 shrink-0 rounded-lg object-cover"
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
            {!produto.disponivel && (
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
        {produto.disponivel ? (
          <Contador
            site={site}
            quantidade={quantidade}
            rotulo={produto.nome}
            onAlterar={onAlterar}
            onAdicionar={() => onAlterar(1)}
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
  onAlterar: (delta: number) => void;
  onAdicionar: () => void;
}) {
  const primaria = site.aparencia.corPrimaria;
  const radius = site.aparencia.botao === "pill" ? "999px" : "var(--ms-radius)";
  if (quantidade === 0)
    return (
      <button
        type="button"
        onClick={onAdicionar}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 text-sm font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
        style={{
          background: primaria,
          color: contraste(primaria),
          borderRadius: radius,
          outlineColor: primaria,
        }}
      >
        <Plus size={15} aria-hidden /> Adicionar
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
        onClick={() => onAlterar(1)}
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

  const refModal = useFocoModal(true, onFechar);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
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
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto p-4 sm:rounded-2xl"
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
          {!produto.disponivel && (
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

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="sm:w-40">
            <Contador
              site={site}
              quantidade={quantidade}
              rotulo={produto.nome}
              onAlterar={(d) => onAlterar(d, nota)}
              onAdicionar={() => onAlterar(1, nota)}
            />
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
  onObservacao,
  linkPedido,
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
  onObservacao: (id: string, valor: string) => void;
  linkPedido?: string | undefined;
  onEnviar: () => void;
}) {
  const primaria = site.aparencia.corPrimaria;
  const modalidades: Entrega[] = perfilCatalogo(site).modalidades ?? ["entrega", "retirada"];
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
              <input
                value={i.observacao ?? ""}
                onChange={(e) => onObservacao(i.produtoId, e.target.value)}
                aria-label={`Observação para ${i.nome}`}
                placeholder="Observação"
                className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-xs outline-none focus-visible:outline focus-visible:outline-2"
                style={{
                  border: "1px solid var(--ms-border)",
                  borderRadius: "var(--ms-radius)",
                  outlineColor: primaria,
                }}
              />
            </div>
          </li>
        ))}
      </ul>

      <div
        role="group"
        aria-label="Modalidade do pedido"
        className="-mx-1 flex gap-2 overflow-x-auto px-1"
      >
        {modalidades.map((op) => (
          <Chip key={op} ativo={entrega === op} cor={primaria} onClick={() => setEntrega(op)}>
            {rotulosModalidade[op]}
          </Chip>
        ))}
      </div>

      <div className="grid gap-2">
        {campo("nome", "Seu nome")}
        {campo("whatsapp", "WhatsApp para contato", "(00) 00000-0000")}
      </div>

      {entrega === "mesa" && (
        <div className="grid gap-2 sm:grid-cols-2">
          {campo("mesa", "Número da mesa", "Ex.: 12")}
          {campo("pessoas", "Quantas pessoas?", "Ex.: 4")}
          <div className="sm:col-span-2">{campo("observacao", "Observações do pedido")}</div>
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
        {(Object.keys(rotulosPagamento) as Pagamento[]).map((p) => (
          <Chip key={p} ativo={pagamento === p} cor={primaria} onClick={() => setPagamento(p)}>
            {rotulosPagamento[p]}
          </Chip>
        ))}
      </div>
      {pagamento === "dinheiro" && campo("troco", "Troco para quanto?", "Ex.: R$ 100,00")}

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

      {totais.abaixoDoMinimo ? (
        <p className="text-xs opacity-75">
          Pedido mínimo de {moeda(totais.minimo)} para enviar pelo WhatsApp.
        </p>
      ) : (
        <a
          href={linkPedido}
          target={linkPedido ? "_blank" : undefined}
          rel="noreferrer"
          aria-disabled={linkPedido ? undefined : true}
          onClick={linkPedido ? onEnviar : undefined}
          className="inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            background: primaria,
            color: contraste(primaria),
            borderRadius: site.aparencia.botao === "pill" ? "999px" : "var(--ms-radius)",
            outlineColor: primaria,
            opacity: linkPedido ? 1 : 0.6,
          }}
        >
          <MessageCircle size={15} aria-hidden />{" "}
          {entrega === "mesa" ? "Enviar pedido para a equipe" : "Continuar pedido no WhatsApp"}
        </a>
      )}
      <p className="text-[11px] opacity-70">
        {entrega === "mesa"
          ? "O pedido segue para o WhatsApp do estabelecimento e será confirmado pela equipe. O envio automático para a cozinha fica disponível após a ativação da operação."
          : "O pedido é finalizado na conversa do WhatsApp com o estabelecimento. Nenhum pagamento é processado aqui."}
      </p>
    </div>
  );
}
