import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, FolderPen } from "lucide-react";
import {
  categoriasDeProdutos,
  descontoPercentual,
  enderecoCardapio,
  perfilCatalogo,
  precoFinal,
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
  const categorias = useMemo(() => categoriasDeProdutos(site.produtos), [site.produtos]);
  const semCategoria = site.produtos.filter((p) => !p.categoria);
  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState("");

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
    aplicar((s) => ({
      ...s,
      produtos: s.produtos.map((x) => (x.id === id ? { ...x, categoria } : x)),
    }));

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
          <a
            href={enderecoCardapio(site.slug)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold"
          >
            <ExternalLink size={14} aria-hidden /> Abrir página
          </a>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Grupos de opção sugeridos para este segmento: {perfil.gruposOpcao.join(" · ")}.
        </p>
      </section>

      {[...categorias, ...(semCategoria.length ? ["Sem categoria"] : [])].map((cat) => {
        const itens =
          cat === "Sem categoria"
            ? semCategoria
            : site.produtos.filter((p) => p.categoria === cat);
        return (
          <section key={cat} className="rounded-2xl border border-border bg-card p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
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
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/70 p-3"
                  >
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
    </div>
  );
}
