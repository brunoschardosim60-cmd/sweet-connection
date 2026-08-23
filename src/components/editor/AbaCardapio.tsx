import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Eye,
  EyeOff,
  FolderPen,
  GripVertical,
} from "lucide-react";
import { CatalogoPagina } from "@/components/minisite/CatalogoPagina";
import { SeletorMidia } from "@/components/editor/SeletorMidia";
import {
  categoriasDeProdutos,
  descontoPercentual,
  enderecoCardapio,
  perfilCatalogo,
  precoFinal,
  normalizarCategoria,
} from "@/lib/nexa/catalogo";
import { moeda } from "@/lib/nexa/utils";
import type { Produto, Site } from "@/lib/nexa/types";

type Aplicar = (fn: (s: Site) => Site) => void;

/**
 * Organização do catálogo: categorias, ordem dos itens e visão do que aparece
 * na seleção compacta da página principal. Edição detalhada segue na aba Itens.
 */
export function AbaCardapio({
  site,
  aplicar,
  onIrParaItens,
}: {
  site: Site;
  aplicar: Aplicar;
  onIrParaItens?: () => void;
}) {
  const perfil = perfilCatalogo(site);
  const comercio = site.comercio ?? { carrinho: false, taxaEntrega: 0, pedidoMinimo: 0 };
  const categorias = useMemo(() => categoriasDeProdutos(site.produtos), [site.produtos]);
  const semCategoria = site.produtos.filter((p) => !p.categoria);
  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [previa, setPrevia] = useState(true);
  const [versaoDestaquePrevia, setVersaoDestaquePrevia] = useState(0);
  const [arrastando, setArrastando] = useState<
    { tipo: "produto"; id: string } | { tipo: "categoria"; nome: string } | null
  >(null);

  /** Reordena produtos dentro do array real, sem duplicar nada. */
  const soltarProduto = (alvoId: string) => {
    const origem = arrastando?.tipo === "produto" ? arrastando.id : null;
    setArrastando(null);
    if (!origem || origem === alvoId) return;
    aplicar((s) => {
      const lista = [...s.produtos];
      const i = lista.findIndex((x) => x.id === origem);
      const j = lista.findIndex((x) => x.id === alvoId);
      if (i < 0 || j < 0) return s;
      const [item] = lista.splice(i, 1);
      if (!item) return s;
      lista.splice(j, 0, { ...item, categoria: lista[j]?.categoria ?? item.categoria });
      return { ...s, produtos: lista };
    });
  };

  /** Move o bloco inteiro de uma categoria para a posição de outra. */
  const soltarCategoria = (alvo: string) => {
    const origem = arrastando?.tipo === "categoria" ? arrastando.nome : null;
    setArrastando(null);
    if (!origem || origem === alvo) return;
    aplicar((s) => {
      const chave = (p: Produto) => p.categoria || "Sem categoria";
      const ordem: string[] = [];
      for (const p of s.produtos) if (!ordem.includes(chave(p))) ordem.push(chave(p));
      const i = ordem.indexOf(origem);
      const j = ordem.indexOf(alvo);
      if (i < 0 || j < 0) return s;
      ordem.splice(j, 0, ...ordem.splice(i, 1));
      const produtos = ordem.flatMap((c) => s.produtos.filter((p) => chave(p) === c));
      return { ...s, produtos };
    });
  };

  const mover = (produto: Produto, direcao: -1 | 1) =>
    aplicar((s) => {
      const lista = [...s.produtos];
      const i = lista.findIndex((x) => x.id === produto.id);
      const j = i + direcao;
      if (i < 0 || j < 0 || j >= lista.length) return s;
      const atual = lista[i];
      const outro = lista[j];
      if (!atual || !outro) return s;
      lista[i] = outro;
      lista[j] = atual;
      return { ...s, produtos: lista };
    });

  const definirCategoria = (id: string, categoria: string) =>
    aplicar((s) => {
      const categoriasAtuais = categoriasDeProdutos(s.produtos).filter(
        (nome) => !s.produtos.some((produto) => produto.id === id && produto.categoria === nome),
      );
      return {
        ...s,
        produtos: s.produtos.map((x) =>
          x.id === id ? { ...x, categoria: normalizarCategoria(categoria, categoriasAtuais) } : x,
        ),
      };
    });

  const renomearCategoria = (antiga: string, nova: string) => {
    const limpo = nova.trim();
    if (!limpo || limpo === antiga) return;
    aplicar((s) => ({
      ...s,
      produtos: s.produtos.map((x) => (x.categoria === antiga ? { ...x, categoria: limpo } : x)),
    }));
  };

  if (site.produtos.length === 0)
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center">
        <p className="text-sm font-semibold">Nenhum item cadastrado</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Cadastre produtos na aba Itens para montar o {perfil.rotulo.toLowerCase()}.
        </p>
        {onIrParaItens && (
          <button
            type="button"
            onClick={onIrParaItens}
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-semibold text-ink-foreground"
          >
            Ir para Itens
          </button>
        )}
      </div>
    );

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{perfil.rotulo} completo</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {site.produtos.length} itens em {Math.max(categorias.length, 1)}{" "}
              {categorias.length === 1 ? "categoria" : "categorias"}. A página principal mostra até
              6 itens em destaque.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setPrevia((v) => !v)}
              aria-pressed={previa}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold"
            >
              {previa ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
              {previa ? "Ocultar prévia" : "Ver prévia"}
            </button>
            <a
              href={enderecoCardapio(site.slug)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold"
            >
              <ExternalLink size={14} aria-hidden /> Abrir página
            </a>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Grupos de opção sugeridos para este segmento: {perfil.gruposOpcao.join(" · ")}.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Operação do {perfil.rotulo.toLowerCase()}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Valores usados no carrinho e no pedido enviado por WhatsApp.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-muted-foreground">
            Taxa de entrega (R$)
            <input
              type="number"
              min={0}
              step="0.5"
              value={comercio.taxaEntrega}
              onChange={(e) =>
                aplicar((s) => ({
                  ...s,
                  comercio: {
                    ...comercio,
                    ...s.comercio,
                    taxaEntrega: Number(e.target.value) || 0,
                  },
                }))
              }
              className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
            />
          </label>
          <label className="block text-xs text-muted-foreground">
            Pedido mínimo (R$)
            <input
              type="number"
              min={0}
              step="1"
              value={comercio.pedidoMinimo}
              onChange={(e) =>
                aplicar((s) => ({
                  ...s,
                  comercio: {
                    ...comercio,
                    ...s.comercio,
                    pedidoMinimo: Number(e.target.value) || 0,
                  },
                }))
              }
              className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
            />
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={comercio.carrinho}
            onChange={(e) =>
              aplicar((s) => ({
                ...s,
                comercio: { ...comercio, ...s.comercio, carrinho: e.target.checked },
              }))
            }
            className="h-5 w-5 rounded border-border"
          />
          Carrinho e confirmação de pedido no painel
        </label>
        <fieldset className="mt-4">
          <legend className="text-xs font-medium text-muted-foreground">
            Formas de pagamento aceitas
          </legend>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            {(["pix", "cartao", "dinheiro", "balcao"] as const).map((tipo) => {
              const aceitos = comercio.pagamentosAceitos ?? ["pix", "cartao", "dinheiro"];
              return (
                <label key={tipo} className="flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={aceitos.includes(tipo)}
                    onChange={(e) =>
                      aplicar((s) => ({
                        ...s,
                        comercio: {
                          ...comercio,
                          ...s.comercio,
                          pagamentosAceitos: e.target.checked
                            ? [...aceitos, tipo]
                            : aceitos.filter((p) => p !== tipo),
                        },
                      }))
                    }
                  />
                  {tipo === "balcao"
                    ? "Pagar no balcão"
                    : tipo === "cartao"
                      ? "Cartão"
                      : tipo[0]?.toUpperCase() + tipo.slice(1)}
                </label>
              );
            })}
          </div>
        </fieldset>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground">
            Chave Pix do estabelecimento
            <input
              value={comercio.pixChave ?? ""}
              onChange={(e) =>
                aplicar((s) => ({
                  ...s,
                  comercio: { ...comercio, ...s.comercio, pixChave: e.target.value },
                }))
              }
              className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Favorecido do Pix
            <input
              value={comercio.pixFavorecido ?? ""}
              onChange={(e) =>
                aplicar((s) => ({
                  ...s,
                  comercio: { ...comercio, ...s.comercio, pixFavorecido: e.target.value },
                }))
              }
              className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
            />
          </label>
        </div>
        <label className="mt-3 block text-xs text-muted-foreground">
          Taxas por bairro (um por linha: Bairro = valor)
          <textarea
            rows={3}
            value={(comercio.taxasPorBairro ?? []).map((t) => `${t.bairro} = ${t.taxa}`).join("\n")}
            onChange={(e) => {
              const taxasPorBairro = e.target.value.split("\n").flatMap((linha) => {
                const [bairro, valor] = linha.split("=");
                const taxa = Number(valor?.replace(",", ".").trim());
                return bairro?.trim() && Number.isFinite(taxa) && taxa >= 0
                  ? [{ bairro: bairro.trim(), taxa }]
                  : [];
              });
              aplicar((s) => ({ ...s, comercio: { ...comercio, ...s.comercio, taxasPorBairro } }));
            }}
            placeholder="Centro = 5\nBela Vista = 8"
            className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground"
          />
        </label>
        <p className="mt-3 rounded-xl border border-dashed border-border p-3 text-[11px] text-muted-foreground">
          Mesas e pedidos reais são geridos na rota Pedidos do painel. Os horários de atendimento
          usados no status “Aberto agora” são os da aba Contato.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Destaque ao abrir cardápio</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Mostre uma campanha, prato do dia ou promoção uma vez por visita. O cliente pode
              fechar pelo X, toque fora ou deslize para baixo.
            </p>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={Boolean(comercio.destaqueAbertura?.ativo)}
              onChange={(e) =>
                aplicar((s) => ({
                  ...s,
                  comercio: {
                    ...comercio,
                    ...s.comercio,
                    destaqueAbertura: {
                      ativo: e.target.checked,
                      imagem: comercio.destaqueAbertura?.imagem ?? "",
                      titulo: comercio.destaqueAbertura?.titulo ?? "",
                      legenda: comercio.destaqueAbertura?.legenda ?? "",
                      ...(comercio.destaqueAbertura?.produtoId
                        ? { produtoId: comercio.destaqueAbertura.produtoId }
                        : {}),
                      ...(comercio.destaqueAbertura?.categoria
                        ? { categoria: comercio.destaqueAbertura.categoria }
                        : {}),
                    },
                  },
                }))
              }
            />
            Exibir destaque
          </label>
        </div>
        {comercio.destaqueAbertura?.ativo && (
          <div className="mt-4 grid gap-3">
            <SeletorMidia
              rotulo="Imagem do destaque"
              valor={comercio.destaqueAbertura.imagem ?? ""}
              onChange={(imagem) =>
                aplicar((s) => ({
                  ...s,
                  comercio: {
                    ...comercio,
                    ...s.comercio,
                    destaqueAbertura: { ...comercio.destaqueAbertura!, imagem },
                  },
                }))
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-muted-foreground">
                Título curto
                <input
                  value={comercio.destaqueAbertura.titulo}
                  maxLength={80}
                  onChange={(e) =>
                    aplicar((s) => ({
                      ...s,
                      comercio: {
                        ...comercio,
                        ...s.comercio,
                        destaqueAbertura: { ...comercio.destaqueAbertura!, titulo: e.target.value },
                      },
                    }))
                  }
                  className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                  placeholder="Ex.: Prato do dia"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Destino ao tocar
                <select
                  value={
                    comercio.destaqueAbertura.produtoId
                      ? `produto:${comercio.destaqueAbertura.produtoId}`
                      : comercio.destaqueAbertura.categoria
                        ? `categoria:${comercio.destaqueAbertura.categoria}`
                        : ""
                  }
                  onChange={(e) => {
                    const [tipo, valor] = e.target.value.split(":");
                    aplicar((s) => {
                      const {
                        produtoId: _produtoId,
                        categoria: _categoria,
                        ...semDestino
                      } = comercio.destaqueAbertura!;
                      return {
                        ...s,
                        comercio: {
                          ...comercio,
                          ...s.comercio,
                          destaqueAbertura: {
                            ...semDestino,
                            ...(tipo === "produto" && valor ? { produtoId: valor } : {}),
                            ...(tipo === "categoria" && valor ? { categoria: valor } : {}),
                          },
                        },
                      };
                    });
                  }}
                  className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Somente fechar destaque</option>
                  <optgroup label="Produtos">
                    {site.produtos.map((produto) => (
                      <option key={produto.id} value={`produto:${produto.id}`}>
                        {produto.nome}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Categorias">
                    {categorias.map((cat) => (
                      <option key={cat} value={`categoria:${cat}`}>
                        {cat}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
            </div>
            <label className="text-xs text-muted-foreground">
              Legenda
              <textarea
                rows={2}
                value={comercio.destaqueAbertura.legenda}
                maxLength={180}
                onChange={(e) =>
                  aplicar((s) => ({
                    ...s,
                    comercio: {
                      ...comercio,
                      ...s.comercio,
                      destaqueAbertura: { ...comercio.destaqueAbertura!, legenda: e.target.value },
                    },
                  }))
                }
                className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground"
                placeholder="Ex.: Disponível hoje, enquanto durar."
              />
            </label>
          </div>
        )}
      </section>

      {previa && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Prévia da página do cardápio</h3>
            {comercio.destaqueAbertura?.ativo && comercio.destaqueAbertura.imagem && (
              <button
                type="button"
                onClick={() => setVersaoDestaquePrevia((versao) => versao + 1)}
                className="min-h-11 rounded-full border border-border px-3 text-xs font-semibold"
              >
                Ver destaque de abertura
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Reflete em tempo real a ordem, as categorias e os selos exibidos em{" "}
            {enderecoCardapio(site.slug)}. Nesta prévia os links externos ficam desativados.
          </p>
          <div
            aria-label="Prévia do cardápio"
            className="mt-3 max-h-[520px] overflow-y-auto rounded-2xl border border-border"
          >
            <CatalogoPagina
              key={versaoDestaquePrevia}
              site={site}
              interacoesExternas={false}
              forcarDestaqueInicial={versaoDestaquePrevia > 0}
              mostrarCarrinhoFlutuante={false}
            />
          </div>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Arraste pelo apoio <GripVertical size={12} className="inline" aria-hidden /> para reordenar
        categorias e itens, ou use as setas. A ordem salva é a mesma exibida na página pública.
      </p>

      {[...categorias, ...(semCategoria.length ? ["Sem categoria"] : [])].map((cat) => {
        const itens =
          cat === "Sem categoria" ? semCategoria : site.produtos.filter((p) => p.categoria === cat);
        return (
          <section
            key={cat}
            onDragOver={(e) => {
              if (arrastando?.tipo === "categoria") e.preventDefault();
            }}
            onDrop={() => soltarCategoria(cat)}
            className={`rounded-2xl border bg-card p-4 ${
              arrastando?.tipo === "categoria" && arrastando.nome !== cat
                ? "border-dashed border-ink/60"
                : "border-border"
            }`}
          >
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
              <span
                draggable
                onDragStart={() => setArrastando({ tipo: "categoria", nome: cat })}
                onDragEnd={() => setArrastando(null)}
                aria-label={`Arrastar categoria ${cat}`}
                className="grid h-11 w-8 cursor-grab place-items-center text-muted-foreground active:cursor-grabbing"
              >
                <GripVertical size={16} aria-hidden />
              </span>
              <div className="min-w-0">
                {renomeando === cat && cat !== "Sem categoria" ? (
                  <input
                    autoFocus
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    onBlur={() => {
                      renomearCategoria(cat, novoNome);
                      setRenomeando(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        renomearCategoria(cat, novoNome);
                        setRenomeando(null);
                      }
                      if (e.key === "Escape") setRenomeando(null);
                    }}
                    aria-label={`Renomear categoria ${cat}`}
                    className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  />
                ) : (
                  <h4 className="truncate text-sm font-semibold">{cat}</h4>
                )}
                <p className="text-xs text-muted-foreground">
                  {itens.length} {itens.length === 1 ? "item" : "itens"}
                </p>
              </div>
              {cat !== "Sem categoria" && (
                <button
                  type="button"
                  aria-label={`Renomear categoria ${cat}`}
                  onClick={() => {
                    setNovoNome(cat);
                    setRenomeando(cat);
                  }}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground"
                >
                  <FolderPen size={15} aria-hidden />
                </button>
              )}
            </div>

            <ul className="mt-3 space-y-2">
              {itens.map((p) => {
                const desconto = descontoPercentual(p);
                return (
                  <li
                    key={p.id}
                    onDragOver={(e) => {
                      if (arrastando?.tipo === "produto") e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.stopPropagation();
                      soltarProduto(p.id);
                    }}
                    className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3 ${
                      arrastando?.tipo === "produto" && arrastando.id !== p.id
                        ? "border-dashed border-ink/60"
                        : "border-border/70"
                    }`}
                  >
                    <span
                      draggable
                      onDragStart={() => setArrastando({ tipo: "produto", id: p.id })}
                      onDragEnd={() => setArrastando(null)}
                      aria-label={`Arrastar ${p.nome}`}
                      className="grid h-11 w-8 cursor-grab place-items-center text-muted-foreground active:cursor-grabbing"
                    >
                      <GripVertical size={15} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.nome}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{moeda(precoFinal(p))}</span>
                        {desconto > 0 && <span>promoção −{desconto}%</span>}
                        {p.destaque && <span>destaque</span>}
                        {!p.disponivel && <span>indisponível</span>}
                        {p.variacoes.length > 0 && <span>{p.variacoes.length} variações</span>}
                      </p>
                      <label className="mt-2 block text-[11px] text-muted-foreground">
                        Categoria
                        <input
                          value={p.categoria}
                          list="categorias-cardapio"
                          onChange={(e) => definirCategoria(p.id, e.target.value)}
                          placeholder="Ex.: Entradas"
                          className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                        />
                      </label>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        type="button"
                        aria-label={`Mover ${p.nome} para cima`}
                        onClick={() => mover(p, -1)}
                        className="grid h-11 w-11 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground"
                      >
                        <ArrowUp size={15} aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label={`Mover ${p.nome} para baixo`}
                        onClick={() => mover(p, 1)}
                        className="grid h-11 w-11 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground"
                      >
                        <ArrowDown size={15} aria-hidden />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <datalist id="categorias-cardapio">
        {categorias.map((categoria) => (
          <option key={categoria} value={categoria} />
        ))}
      </datalist>
    </div>
  );
}
