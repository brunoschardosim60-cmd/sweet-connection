import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  Globe,
  Monitor,
  Plus,
  Redo2,
  Save,
  Smartphone,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { PhoneFrame } from "@/components/PhoneFrame";
import { MiniSite } from "@/components/minisite/MiniSite";
import { useHistorico, useNexa } from "@/lib/nexa/hooks";
import { imagens } from "@/lib/nexa/images";
import { modelos } from "@/lib/nexa/modelos";
import { slugify, telefoneMask, uid } from "@/lib/nexa/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { Site } from "@/lib/nexa/types";

export const Route = createFileRoute("/painel/editor/$id")({
  head: () => ({
    meta: [
      { title: "Editor visual — Nexa" },
      { name: "description", content: "Edite conteúdo, seções e aparência com prévia em tempo real." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Editor visual — Nexa" },
      { property: "og:description", content: "Personalize o mini-site e publique em um clique." },
    ],
  }),
  component: Editor,
});

type Aba = "conteudo" | "secoes" | "itens" | "aparencia" | "seo";

const abas: { id: Aba; rotulo: string }[] = [
  { id: "conteudo", rotulo: "Conteúdo" },
  { id: "secoes", rotulo: "Seções" },
  { id: "itens", rotulo: "Itens" },
  { id: "aparencia", rotulo: "Aparência" },
  { id: "seo", rotulo: "SEO" },
];

function Editor() {
  const { id } = Route.useParams();
  const { sites, pronto, store } = useNexa();
  const navigate = useNavigate();

  const original = sites.find((s) => s.id === id);
  const [rascunho, setRascunho] = useState<Site | null>(null);
  const [aba, setAba] = useState<Aba>("conteudo");
  const [dispositivo, setDispositivo] = useState<"celular" | "desktop">("celular");
  const [sujo, setSujo] = useState(false);

  useEffect(() => {
    if (original && !rascunho) setRascunho(structuredClone(original));
  }, [original, rascunho]);

  const hist = useHistorico<Site | null>(rascunho);

  const aplicar = (fn: (s: Site) => Site) => {
    setRascunho((atual) => {
      if (!atual) return atual;
      hist.registrar(structuredClone(atual));
      return fn(structuredClone(atual));
    });
    setSujo(true);
  };

  const salvar = async (patch?: Partial<Site>) => {
    if (!rascunho) return;
    const proximo = { ...rascunho, ...patch };
    setRascunho(proximo);
    await store.atualizarSite(rascunho.id, () => proximo);
    setSujo(false);
    toast.success("Alterações salvas");
  };

  const publicar = async () => {
    if (!rascunho) return;
    const publicado = rascunho.status === "publicado";
    await salvar({ status: publicado ? "rascunho" : "publicado" });
    toast[publicado ? "message" : "success"](
      publicado ? "Mini-site despublicado" : "Mini-site publicado",
      { description: publicado ? "Ele voltou para rascunho." : `Disponível em /site/${rascunho.slug}` },
    );
  };

  if (!pronto)
    return (
      <div className="grid min-h-screen grid-cols-1 gap-4 p-6 lg:grid-cols-[380px_1fr]">
        <Skeleton className="h-[70vh] rounded-2xl" />
        <Skeleton className="h-[70vh] rounded-2xl" />
      </div>
    );

  if (!original || !rascunho)
    return (
      <div className="grid min-h-screen place-items-center px-5 text-center">
        <div>
          <h1 className="font-display text-2xl font-bold">Mini-site não encontrado</h1>
          <Link
            to="/painel/clientes"
            className="mt-6 inline-block rounded-full bg-ink px-5 py-3 text-sm font-semibold text-ink-foreground"
          >
            Voltar para clientes
          </Link>
        </div>
      </div>
    );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Voltar"
            onClick={() => void navigate({ to: "/painel/clientes" })}
            className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-secondary"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{rascunho.conteudo.nome}</p>
            <p className="text-xs text-muted-foreground">
              /site/{rascunho.slug} · {sujo ? "alterações não salvas" : "tudo salvo"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="Desfazer"
            disabled={!hist.podeDesfazer}
            onClick={() => {
              const v = hist.desfazer();
              if (v) {
                setRascunho(v);
                setSujo(true);
              }
            }}
            className="grid h-9 w-9 place-items-center rounded-full border border-border disabled:opacity-40"
          >
            <Undo2 size={15} />
          </button>
          <button
            type="button"
            aria-label="Refazer"
            disabled={!hist.podeRefazer}
            onClick={() => {
              const v = hist.refazer();
              if (v) {
                setRascunho(v);
                setSujo(true);
              }
            }}
            className="grid h-9 w-9 place-items-center rounded-full border border-border disabled:opacity-40"
          >
            <Redo2 size={15} />
          </button>
          <div className="hidden rounded-full border border-border p-0.5 sm:flex">
            <button
              type="button"
              aria-label="Prévia celular"
              onClick={() => setDispositivo("celular")}
              className={`grid h-8 w-8 place-items-center rounded-full ${dispositivo === "celular" ? "bg-secondary" : ""}`}
            >
              <Smartphone size={15} />
            </button>
            <button
              type="button"
              aria-label="Prévia desktop"
              onClick={() => setDispositivo("desktop")}
              className={`grid h-8 w-8 place-items-center rounded-full ${dispositivo === "desktop" ? "bg-secondary" : ""}`}
            >
              <Monitor size={15} />
            </button>
          </div>
          <a
            href={`/site/${rascunho.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            <Eye size={15} /> <span className="hidden sm:inline">Ver site</span>
          </a>
          <button
            type="button"
            onClick={() => void salvar()}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
          >
            <Save size={15} /> Salvar
          </button>
          <button
            type="button"
            onClick={() => void publicar()}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-ink-foreground"
          >
            <Globe size={15} />
            {rascunho.status === "publicado" ? "Despublicar" : "Publicar"}
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[400px_1fr]">
        <aside className="border-b border-border p-4 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap gap-1.5">
            {abas.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAba(a.id)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  aba === a.id ? "bg-ink text-ink-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {a.rotulo}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-5 lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto lg:pr-1">
            {aba === "conteudo" && <AbaConteudo site={rascunho} aplicar={aplicar} />}
            {aba === "secoes" && <AbaSecoes site={rascunho} aplicar={aplicar} />}
            {aba === "itens" && <AbaItens site={rascunho} aplicar={aplicar} />}
            {aba === "aparencia" && <AbaAparencia site={rascunho} aplicar={aplicar} />}
            {aba === "seo" && <AbaSeo site={rascunho} aplicar={aplicar} />}
          </div>
        </aside>

        <section className="grid place-items-start justify-center bg-secondary/40 p-6">
          {dispositivo === "celular" ? (
            <PhoneFrame altura={680}>
              <MiniSite site={rascunho} botaoFlutuante={false} />
            </PhoneFrame>
          ) : (
            <div className="h-[680px] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
              <MiniSite site={rascunho} botaoFlutuante={false} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ------------------------------ campos ------------------------------ */

type Aplicar = (fn: (s: Site) => Site) => void;

function Texto({
  rotulo,
  valor,
  onChange,
  placeholder,
  area,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  area?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{rotulo}</span>
      {area ? (
        <textarea
          value={valor}
          placeholder={placeholder}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-ink"
        />
      ) : (
        <input
          value={valor}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-ink"
        />
      )}
    </label>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="surface space-y-3 p-4">
      <p className="text-sm font-semibold">{titulo}</p>
      {children}
    </div>
  );
}

/* ------------------------------ conteúdo ------------------------------ */

function AbaConteudo({ site, aplicar }: { site: Site; aplicar: Aplicar }) {
  const set = (patch: Partial<Site["conteudo"]>) =>
    aplicar((s) => ({ ...s, conteudo: { ...s.conteudo, ...patch } }));

  return (
    <>
      <Bloco titulo="Identificação">
        <Texto
          rotulo="Nome exibido"
          valor={site.conteudo.nome}
          onChange={(v) => set({ nome: v })}
        />
        <Texto
          rotulo="Descrição curta"
          area
          valor={site.conteudo.descricao}
          onChange={(v) => set({ descricao: v })}
          placeholder="O que o negócio faz, em uma frase."
        />
        <Texto
          rotulo="Endereço do site (slug)"
          valor={site.slug}
          onChange={(v) => aplicar((s) => ({ ...s, slug: slugify(v) }))}
        />
      </Bloco>

      <Bloco titulo="Contato">
        <Texto
          rotulo="Telefone"
          valor={site.conteudo.telefone}
          onChange={(v) => set({ telefone: telefoneMask(v) })}
        />
        <Texto
          rotulo="WhatsApp (somente números)"
          valor={site.conteudo.whatsapp}
          onChange={(v) => set({ whatsapp: v.replace(/\D/g, "") })}
        />
        <Texto rotulo="E-mail" valor={site.conteudo.email} onChange={(v) => set({ email: v })} />
        <Texto
          rotulo="Instagram"
          valor={site.conteudo.instagram}
          onChange={(v) => set({ instagram: v.replace("@", "") })}
        />
        <Texto
          rotulo="Endereço"
          valor={site.conteudo.endereco}
          onChange={(v) => set({ endereco: v })}
        />
      </Bloco>

      <Bloco titulo="Imagem de capa">
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(imagens).map(([chave, url]) => (
            <button
              key={chave}
              type="button"
              onClick={() => set({ capa: url })}
              className={`overflow-hidden rounded-lg border ${
                site.conteudo.capa === url ? "border-ink ring-2 ring-lime" : "border-border"
              }`}
            >
              <img src={url} alt={`Capa ${chave}`} loading="lazy" className="h-12 w-full object-cover" />
            </button>
          ))}
        </div>
        <Texto
          rotulo="Ou cole a URL de uma imagem"
          valor={site.conteudo.capa ?? ""}
          onChange={(v) => set({ capa: v })}
        />
      </Bloco>

      <Bloco titulo="Horários">
        <div className="space-y-2">
          {site.conteudo.horarios.map((h, i) => (
            <div key={h.dia} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-sm">{h.dia}</span>
              <input
                type="time"
                value={h.abre}
                disabled={h.fechado}
                onChange={(e) =>
                  aplicar((s) => {
                    const horarios = [...s.conteudo.horarios];
                    horarios[i] = { ...horarios[i]!, abre: e.target.value };
                    return { ...s, conteudo: { ...s.conteudo, horarios } };
                  })
                }
                className="h-9 w-24 rounded-lg border border-border bg-card px-2 text-xs disabled:opacity-40"
              />
              <input
                type="time"
                value={h.fecha}
                disabled={h.fechado}
                onChange={(e) =>
                  aplicar((s) => {
                    const horarios = [...s.conteudo.horarios];
                    horarios[i] = { ...horarios[i]!, fecha: e.target.value };
                    return { ...s, conteudo: { ...s.conteudo, horarios } };
                  })
                }
                className="h-9 w-24 rounded-lg border border-border bg-card px-2 text-xs disabled:opacity-40"
              />
              <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={h.fechado}
                  onChange={(e) =>
                    aplicar((s) => {
                      const horarios = [...s.conteudo.horarios];
                      horarios[i] = { ...horarios[i]!, fechado: e.target.checked };
                      return { ...s, conteudo: { ...s.conteudo, horarios } };
                    })
                  }
                />
                fechado
              </label>
            </div>
          ))}
        </div>
      </Bloco>
    </>
  );
}

/* ------------------------------ seções ------------------------------ */

function AbaSecoes({ site, aplicar }: { site: Site; aplicar: Aplicar }) {
  const mover = (i: number, delta: number) =>
    aplicar((s) => {
      const secoes = [...s.secoes];
      const alvo = i + delta;
      if (alvo < 0 || alvo >= secoes.length) return s;
      const atual = secoes[i]!;
      secoes[i] = secoes[alvo]!;
      secoes[alvo] = atual;
      return { ...s, secoes };
    });

  return (
    <Bloco titulo="Seções do mini-site">
      <p className="text-xs text-muted-foreground">
        Ative, desative e reordene. A prévia atualiza na hora.
      </p>
      <ul className="space-y-2">
        {site.secoes.map((sec, i) => (
          <li
            key={sec.id}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2"
          >
            <div className="flex flex-col">
              <button
                type="button"
                aria-label="Mover para cima"
                onClick={() => mover(i, -1)}
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                aria-label="Mover para baixo"
                onClick={() => mover(i, 1)}
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronDown size={14} />
              </button>
            </div>
            <input
              value={sec.titulo}
              onChange={(e) =>
                aplicar((s) => ({
                  ...s,
                  secoes: s.secoes.map((x) =>
                    x.id === sec.id ? { ...x, titulo: e.target.value } : x,
                  ),
                }))
              }
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={sec.ativa}
                onChange={(e) =>
                  aplicar((s) => ({
                    ...s,
                    secoes: s.secoes.map((x) =>
                      x.id === sec.id ? { ...x, ativa: e.target.checked } : x,
                    ),
                  }))
                }
              />
              ativa
            </label>
          </li>
        ))}
      </ul>
    </Bloco>
  );
}

/* ------------------------------ itens ------------------------------ */

function LinhaItem({
  children,
  onRemover,
}: {
  children: React.ReactNode;
  onRemover: () => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3">
      {children}
      <button
        type="button"
        onClick={onRemover}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ember"
      >
        <Trash2 size={13} /> Remover
      </button>
    </div>
  );
}

function BotaoAdicionar({ rotulo, onClick }: { rotulo: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
    >
      <Plus size={13} /> {rotulo}
    </button>
  );
}

function EntradaSimples({
  valor,
  onChange,
  placeholder,
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={valor}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-ink"
    />
  );
}

function AbaItens({ site, aplicar }: { site: Site; aplicar: Aplicar }) {
  return (
    <>
      <Bloco titulo="Links rápidos">
        {site.links.map((l) => (
          <LinhaItem
            key={l.id}
            onRemover={() => aplicar((s) => ({ ...s, links: s.links.filter((x) => x.id !== l.id) }))}
          >
            <EntradaSimples
              valor={l.titulo}
              placeholder="Título"
              onChange={(v) =>
                aplicar((s) => ({
                  ...s,
                  links: s.links.map((x) => (x.id === l.id ? { ...x, titulo: v } : x)),
                }))
              }
            />
            <EntradaSimples
              valor={l.valor}
              placeholder="URL ou número"
              onChange={(v) =>
                aplicar((s) => ({
                  ...s,
                  links: s.links.map((x) => (x.id === l.id ? { ...x, valor: v } : x)),
                }))
              }
            />
          </LinhaItem>
        ))}
        <BotaoAdicionar
          rotulo="Adicionar link"
          onClick={() =>
            aplicar((s) => ({
              ...s,
              links: [
                ...s.links,
                { id: uid("lnk"), tipo: "personalizado", titulo: "Novo link", valor: "", ativo: true },
              ],
            }))
          }
        />
      </Bloco>

      <Bloco titulo="Produtos">
        {site.produtos.map((p) => (
          <LinhaItem
            key={p.id}
            onRemover={() =>
              aplicar((s) => ({ ...s, produtos: s.produtos.filter((x) => x.id !== p.id) }))
            }
          >
            <EntradaSimples
              valor={p.nome}
              placeholder="Nome do produto"
              onChange={(v) =>
                aplicar((s) => ({
                  ...s,
                  produtos: s.produtos.map((x) => (x.id === p.id ? { ...x, nome: v } : x)),
                }))
              }
            />
            <EntradaSimples
              valor={p.descricao}
              placeholder="Descrição"
              onChange={(v) =>
                aplicar((s) => ({
                  ...s,
                  produtos: s.produtos.map((x) => (x.id === p.id ? { ...x, descricao: v } : x)),
                }))
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <EntradaSimples
                valor={String(p.preco)}
                placeholder="Preço"
                onChange={(v) =>
                  aplicar((s) => ({
                    ...s,
                    produtos: s.produtos.map((x) =>
                      x.id === p.id ? { ...x, preco: Number(v.replace(",", ".")) || 0 } : x,
                    ),
                  }))
                }
              />
              <EntradaSimples
                valor={p.categoria}
                placeholder="Categoria"
                onChange={(v) =>
                  aplicar((s) => ({
                    ...s,
                    produtos: s.produtos.map((x) => (x.id === p.id ? { ...x, categoria: v } : x)),
                  }))
                }
              />
            </div>
          </LinhaItem>
        ))}
        <BotaoAdicionar
          rotulo="Adicionar produto"
          onClick={() =>
            aplicar((s) => ({
              ...s,
              produtos: [
                ...s.produtos,
                {
                  id: uid("prd"),
                  nome: "Novo produto",
                  descricao: "",
                  preco: 0,
                  categoria: "Geral",
                  variacoes: [],
                  disponivel: true,
                  destaque: false,
                },
              ],
            }))
          }
        />
      </Bloco>

      <Bloco titulo="Serviços">
        {site.servicos.map((sv) => (
          <LinhaItem
            key={sv.id}
            onRemover={() =>
              aplicar((s) => ({ ...s, servicos: s.servicos.filter((x) => x.id !== sv.id) }))
            }
          >
            <EntradaSimples
              valor={sv.nome}
              placeholder="Nome do serviço"
              onChange={(v) =>
                aplicar((s) => ({
                  ...s,
                  servicos: s.servicos.map((x) => (x.id === sv.id ? { ...x, nome: v } : x)),
                }))
              }
            />
            <EntradaSimples
              valor={sv.descricao}
              placeholder="Descrição"
              onChange={(v) =>
                aplicar((s) => ({
                  ...s,
                  servicos: s.servicos.map((x) => (x.id === sv.id ? { ...x, descricao: v } : x)),
                }))
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <EntradaSimples
                valor={sv.duracao}
                placeholder="Duração"
                onChange={(v) =>
                  aplicar((s) => ({
                    ...s,
                    servicos: s.servicos.map((x) => (x.id === sv.id ? { ...x, duracao: v } : x)),
                  }))
                }
              />
              <EntradaSimples
                valor={String(sv.preco)}
                placeholder="Preço"
                onChange={(v) =>
                  aplicar((s) => ({
                    ...s,
                    servicos: s.servicos.map((x) =>
                      x.id === sv.id ? { ...x, preco: Number(v.replace(",", ".")) || 0 } : x,
                    ),
                  }))
                }
              />
            </div>
          </LinhaItem>
        ))}
        <BotaoAdicionar
          rotulo="Adicionar serviço"
          onClick={() =>
            aplicar((s) => ({
              ...s,
              servicos: [
                ...s.servicos,
                { id: uid("srv"), nome: "Novo serviço", descricao: "", duracao: "30 min", preco: 0 },
              ],
            }))
          }
        />
      </Bloco>

      <Bloco titulo="Galeria">
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(imagens).map(([chave, url]) => (
            <button
              key={chave}
              type="button"
              aria-label={`Adicionar imagem ${chave}`}
              onClick={() =>
                aplicar((s) => ({
                  ...s,
                  galeria: [...s.galeria, { id: uid("img"), url, titulo: chave }],
                }))
              }
              className="overflow-hidden rounded-lg border border-border"
            >
              <img src={url} alt={chave} loading="lazy" className="h-12 w-full object-cover" />
            </button>
          ))}
        </div>
        {site.galeria.length > 0 && (
          <ul className="space-y-2">
            {site.galeria.map((g) => (
              <li key={g.id} className="flex items-center gap-2 text-sm">
                <img src={g.url} alt={g.titulo} className="h-8 w-8 rounded object-cover" />
                <span className="min-w-0 flex-1 truncate">{g.titulo}</span>
                <button
                  type="button"
                  aria-label="Remover imagem"
                  onClick={() =>
                    aplicar((s) => ({ ...s, galeria: s.galeria.filter((x) => x.id !== g.id) }))
                  }
                  className="text-ember"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Bloco>

      <Bloco titulo="Depoimentos">
        {site.depoimentos.map((d) => (
          <LinhaItem
            key={d.id}
            onRemover={() =>
              aplicar((s) => ({ ...s, depoimentos: s.depoimentos.filter((x) => x.id !== d.id) }))
            }
          >
            <EntradaSimples
              valor={d.nome}
              placeholder="Nome do cliente"
              onChange={(v) =>
                aplicar((s) => ({
                  ...s,
                  depoimentos: s.depoimentos.map((x) => (x.id === d.id ? { ...x, nome: v } : x)),
                }))
              }
            />
            <EntradaSimples
              valor={d.comentario}
              placeholder="Comentário"
              onChange={(v) =>
                aplicar((s) => ({
                  ...s,
                  depoimentos: s.depoimentos.map((x) =>
                    x.id === d.id ? { ...x, comentario: v } : x,
                  ),
                }))
              }
            />
          </LinhaItem>
        ))}
        <BotaoAdicionar
          rotulo="Adicionar depoimento"
          onClick={() =>
            aplicar((s) => ({
              ...s,
              depoimentos: [
                ...s.depoimentos,
                {
                  id: uid("dep"),
                  nome: "Cliente",
                  nota: 5,
                  comentario: "",
                  data: new Date().toISOString(),
                  destaque: false,
                },
              ],
            }))
          }
        />
      </Bloco>

      <Bloco titulo="Perguntas frequentes">
        {site.faq.map((f) => (
          <LinhaItem
            key={f.id}
            onRemover={() => aplicar((s) => ({ ...s, faq: s.faq.filter((x) => x.id !== f.id) }))}
          >
            <EntradaSimples
              valor={f.pergunta}
              placeholder="Pergunta"
              onChange={(v) =>
                aplicar((s) => ({
                  ...s,
                  faq: s.faq.map((x) => (x.id === f.id ? { ...x, pergunta: v } : x)),
                }))
              }
            />
            <EntradaSimples
              valor={f.resposta}
              placeholder="Resposta"
              onChange={(v) =>
                aplicar((s) => ({
                  ...s,
                  faq: s.faq.map((x) => (x.id === f.id ? { ...x, resposta: v } : x)),
                }))
              }
            />
          </LinhaItem>
        ))}
        <BotaoAdicionar
          rotulo="Adicionar pergunta"
          onClick={() =>
            aplicar((s) => ({
              ...s,
              faq: [...s.faq, { id: uid("faq"), pergunta: "Nova pergunta", resposta: "" }],
            }))
          }
        />
      </Bloco>
    </>
  );
}

/* ------------------------------ aparência ------------------------------ */

function AbaAparencia({ site, aplicar }: { site: Site; aplicar: Aplicar }) {
  const set = (patch: Partial<Site["aparencia"]>) =>
    aplicar((s) => ({ ...s, aparencia: { ...s.aparencia, ...patch } }));
  const a = site.aparencia;

  return (
    <>
      <Bloco titulo="Cores">
        {(
          [
            ["Cor principal", "corPrimaria"],
            ["Cor de fundo", "corFundo"],
            ["Cor do texto", "corTexto"],
          ] as const
        ).map(([rotulo, chave]) => (
          <label key={chave} className="flex items-center justify-between gap-3">
            <span className="text-sm">{rotulo}</span>
            <span className="flex items-center gap-2">
              <input
                value={a[chave]}
                onChange={(e) => set({ [chave]: e.target.value } as Partial<Site["aparencia"]>)}
                className="h-9 w-24 rounded-lg border border-border bg-card px-2 text-xs"
              />
              <input
                type="color"
                aria-label={rotulo}
                value={a[chave]}
                onChange={(e) => set({ [chave]: e.target.value } as Partial<Site["aparencia"]>)}
                className="h-9 w-9 cursor-pointer rounded-lg border border-border bg-card"
              />
            </span>
          </label>
        ))}
      </Bloco>

      <Bloco titulo="Modelo base">
        <div className="grid grid-cols-2 gap-2">
          {modelos.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() =>
                aplicar((s) => ({
                  ...s,
                  modeloId: m.id,
                  aparencia: {
                    ...s.aparencia,
                    layout: m.layout,
                    corPrimaria: m.paleta.primaria,
                    corFundo: m.paleta.fundo,
                    corTexto: m.paleta.texto,
                  },
                }))
              }
              className={`rounded-lg border px-2.5 py-2 text-left text-xs font-medium ${
                site.modeloId === m.id ? "border-ink ring-2 ring-lime" : "border-border"
              }`}
            >
              {m.nome}
            </button>
          ))}
        </div>
      </Bloco>

      <Bloco titulo="Tipografia e formas">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Fonte</span>
          <select
            value={a.fonte}
            onChange={(e) => set({ fonte: e.target.value as Site["aparencia"]["fonte"] })}
            className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
          >
            <option value="moderna">Moderna</option>
            <option value="elegante">Elegante</option>
            <option value="tecnica">Técnica</option>
            <option value="editorial">Editorial</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Arredondamento: {a.raio}px</span>
          <input
            type="range"
            min={0}
            max={32}
            value={a.raio}
            onChange={(e) => set({ raio: Number(e.target.value) })}
            className="w-full"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Estilo dos botões</span>
          <select
            value={a.botao}
            onChange={(e) => set({ botao: e.target.value as Site["aparencia"]["botao"] })}
            className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
          >
            <option value="solido">Sólido</option>
            <option value="contorno">Contorno</option>
            <option value="suave">Suave</option>
            <option value="pill">Pílula</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Espaçamento</span>
          <select
            value={a.espacamento}
            onChange={(e) =>
              set({ espacamento: e.target.value as Site["aparencia"]["espacamento"] })
            }
            className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
          >
            <option value="compacto">Compacto</option>
            <option value="confortavel">Confortável</option>
            <option value="amplo">Amplo</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Tipo de capa</span>
          <select
            value={a.capaTipo}
            onChange={(e) => set({ capaTipo: e.target.value as Site["aparencia"]["capaTipo"] })}
            className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
          >
            <option value="imagem">Imagem</option>
            <option value="cor">Cor sólida</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={a.animacoes}
            onChange={(e) => set({ animacoes: e.target.checked })}
          />
          Animações suaves
        </label>
      </Bloco>
    </>
  );
}

/* ------------------------------ seo ------------------------------ */

function AbaSeo({ site, aplicar }: { site: Site; aplicar: Aplicar }) {
  const set = (patch: Partial<Site["seo"]>) =>
    aplicar((s) => ({ ...s, seo: { ...s.seo, ...patch } }));
  const setInt = (patch: Partial<Site["integracoes"]>) =>
    aplicar((s) => ({ ...s, integracoes: { ...s.integracoes, ...patch } }));

  return (
    <>
      <Bloco titulo="Busca e compartilhamento">
        <Texto rotulo="Título" valor={site.seo.titulo} onChange={(v) => set({ titulo: v })} />
        <Texto
          rotulo="Descrição"
          area
          valor={site.seo.descricao}
          onChange={(v) => set({ descricao: v })}
        />
        <Texto
          rotulo="Palavras-chave"
          valor={site.seo.palavras}
          onChange={(v) => set({ palavras: v })}
          placeholder="pizzaria, delivery, São Paulo"
        />
      </Bloco>

      <Bloco titulo="Integrações">
        <Texto
          rotulo="Google Analytics"
          valor={site.integracoes.googleAnalytics}
          onChange={(v) => setInt({ googleAnalytics: v })}
          placeholder="G-XXXXXXX"
        />
        <Texto
          rotulo="Meta Pixel"
          valor={site.integracoes.metaPixel}
          onChange={(v) => setInt({ metaPixel: v })}
        />
        <Texto
          rotulo="Domínio próprio"
          valor={site.integracoes.dominio}
          onChange={(v) => setInt({ dominio: v })}
          placeholder="www.cliente.com.br"
        />
      </Bloco>
    </>
  );
}
