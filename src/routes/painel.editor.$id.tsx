import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Copy,
  Download,
  Eye,
  Globe,
  History,
  Loader2,
  Monitor,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Smartphone,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { PhoneFrame } from "@/components/PhoneFrame";
import { MiniSite } from "@/components/minisite/MiniSite";
import { SeletorMidia } from "@/components/editor/SeletorMidia";
import { PreviaCompartilhamento } from "@/components/editor/PreviaCompartilhamento";
import { useHistorico, useNexa } from "@/lib/nexa/hooks";
import { modelos } from "@/lib/nexa/modelos";
import { baixarJson, lerArquivo, mesclarImportacao } from "@/lib/nexa/exportar";
import { versaoStore } from "@/lib/nexa/versoes";
import { hostMarca, marcaStore } from "@/lib/nexa/marca";
import { dataHora, slugify, telefoneMask, uid } from "@/lib/nexa/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { Site, TipoLink } from "@/lib/nexa/types";

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

type Aba = "conteudo" | "secoes" | "itens" | "aparencia" | "seo" | "versoes";

const abas: { id: Aba; rotulo: string }[] = [
  { id: "conteudo", rotulo: "Conteúdo" },
  { id: "secoes", rotulo: "Seções" },
  { id: "itens", rotulo: "Itens" },
  { id: "aparencia", rotulo: "Aparência" },
  { id: "seo", rotulo: "SEO" },
  { id: "versoes", rotulo: "Versões" },
];

function Editor() {
  const { id } = Route.useParams();
  const { sites, pronto, store } = useNexa();
  const navigate = useNavigate();
  const arquivoRef = useRef<HTMLInputElement>(null);

  const original = sites.find((s) => s.id === id);
  const [rascunho, setRascunho] = useState<Site | null>(null);
  const [aba, setAba] = useState<Aba>("conteudo");
  const [dispositivo, setDispositivo] = useState<"celular" | "desktop">("celular");
  const [sujo, setSujo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvoEm, setSalvoEm] = useState<string | null>(null);
  const [autosave, setAutosave] = useState(true);

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

  const salvar = useCallback(
    async (patch?: Partial<Site>, silencioso = false) => {
      setRascunho((atual) => {
        if (!atual) return atual;
        const proximo = { ...atual, ...patch };
        setSalvando(true);
        void store.atualizarSite(atual.id, () => proximo).then(() => {
          setSalvando(false);
          setSujo(false);
          setSalvoEm(new Date().toISOString());
          if (!silencioso) toast.success("Alterações salvas");
        });
        return proximo;
      });
    },
    [store],
  );

  /* autosave com atraso curto */
  useEffect(() => {
    if (!autosave || !sujo || !rascunho) return;
    const t = setTimeout(() => void salvar(undefined, true), 1200);
    return () => clearTimeout(t);
  }, [autosave, sujo, rascunho, salvar]);

  /* aviso ao sair com pendências */
  useEffect(() => {
    if (!sujo) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [sujo]);

  const publicar = async () => {
    if (!rascunho) return;
    const publicado = rascunho.status === "publicado";
    if (!publicado) versaoStore.registrar(rascunho, "publicacao");
    await salvar({ status: publicado ? "rascunho" : "publicado" }, true);
    toast[publicado ? "message" : "success"](
      publicado ? "Mini-site despublicado" : "Mini-site publicado",
      { description: publicado ? "Ele voltou para rascunho." : `Disponível em /site/${rascunho.slug}` },
    );
  };

  const importar = async (arquivo?: File | null) => {
    if (!arquivo || !rascunho) return;
    try {
      const importado = lerArquivo(await arquivo.text());
      versaoStore.registrar(rascunho, "importacao", "Antes da importação");
      const mesclado = mesclarImportacao(rascunho, importado);
      setRascunho(mesclado);
      setSujo(true);
      toast.success("Configuração importada", {
        description: "Conteúdo, seções e aparência foram substituídos.",
      });
    } catch (e) {
      toast.error("Não foi possível importar", { description: (e as Error).message });
    }
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

  const estado = salvando
    ? { icone: <Loader2 size={12} className="animate-spin" />, texto: "salvando…", cor: "text-muted-foreground" }
    : sujo
      ? { icone: <span className="h-1.5 w-1.5 rounded-full bg-ember" />, texto: "alterações não salvas", cor: "text-ember" }
      : {
          icone: <Check size={12} />,
          texto: salvoEm ? `salvo ${dataHora(salvoEm)}` : "tudo salvo",
          cor: "text-muted-foreground",
        };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-3 py-3 backdrop-blur-xl sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            aria-label="Voltar para clientes"
            onClick={() => void navigate({ to: "/painel/clientes" })}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border hover:bg-secondary"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{rascunho.conteudo.nome}</p>
            <p
              aria-live="polite"
              className={`flex items-center gap-1.5 truncate text-xs ${estado.cor}`}
            >
              /site/{rascunho.slug} · {estado.icone} {estado.texto}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          <label className="hidden items-center gap-1.5 text-xs text-muted-foreground xl:flex">
            <input
              type="checkbox"
              checked={autosave}
              onChange={(e) => setAutosave(e.target.checked)}
            />
            autosave
          </label>
          <button
            type="button"
            aria-label="Desfazer"
            title={hist.podeDesfazer ? "Desfazer" : "Nada para desfazer"}
            disabled={!hist.podeDesfazer}
            onClick={() => {
              const v = hist.desfazer();
              if (v) {
                setRascunho(v);
                setSujo(true);
              }
            }}
            className="grid h-11 w-11 place-items-center rounded-full border border-border disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Undo2 size={15} />
          </button>
          <button
            type="button"
            aria-label="Refazer"
            title={hist.podeRefazer ? "Refazer" : "Nada para refazer"}
            disabled={!hist.podeRefazer}
            onClick={() => {
              const v = hist.refazer();
              if (v) {
                setRascunho(v);
                setSujo(true);
              }
            }}
            className="grid h-11 w-11 place-items-center rounded-full border border-border disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Redo2 size={15} />
          </button>
          <button
            type="button"
            aria-label="Exportar JSON"
            title="Exportar JSON"
            onClick={() => baixarJson(rascunho)}
            className="hidden h-11 w-11 place-items-center rounded-full border border-border hover:bg-secondary sm:grid"
          >
            <Download size={15} />
          </button>
          <button
            type="button"
            aria-label="Importar JSON"
            title="Importar JSON"
            onClick={() => arquivoRef.current?.click()}
            className="hidden h-11 w-11 place-items-center rounded-full border border-border hover:bg-secondary sm:grid"
          >
            <Upload size={15} />
          </button>
          <input
            ref={arquivoRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              void importar(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div className="hidden rounded-full border border-border p-0.5 lg:flex">
            <button
              type="button"
              aria-label="Prévia celular"
              aria-pressed={dispositivo === "celular"}
              onClick={() => setDispositivo("celular")}
              className={`grid h-9 w-9 place-items-center rounded-full ${dispositivo === "celular" ? "bg-secondary" : ""}`}
            >
              <Smartphone size={15} />
            </button>
            <button
              type="button"
              aria-label="Prévia desktop"
              aria-pressed={dispositivo === "desktop"}
              onClick={() => setDispositivo("desktop")}
              className={`grid h-9 w-9 place-items-center rounded-full ${dispositivo === "desktop" ? "bg-secondary" : ""}`}
            >
              <Monitor size={15} />
            </button>
          </div>
          <button
            type="button"
            aria-pressed={previaMovel}
            onClick={() => setPreviaMovel((v) => !v)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-secondary lg:hidden"
          >
            <Smartphone size={15} /> {previaMovel ? "Editar" : "Prévia"}
          </button>
          <a
            href={`/site/${rascunho.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-secondary"
          >
            <Eye size={15} /> <span className="hidden sm:inline">Ver site</span>
            <span className="sr-only sm:hidden">Ver site</span>
          </a>
          <button
            type="button"
            disabled={salvando}
            onClick={() => {
              versaoStore.registrar(rascunho, "salvamento");
              void salvar();
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {salvando ? "Salvando…" : "Salvar"}
          </button>
          <button
            type="button"
            onClick={() => void publicar()}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-ink-foreground"
          >
            <Globe size={15} />
            {rascunho.status === "publicado" ? "Despublicar" : "Publicar"}
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(340px,400px)_1fr]">
        <aside
          className={`min-w-0 border-b border-border p-4 lg:block lg:border-b-0 lg:border-r ${
            previaMovel ? "hidden" : "block"
          }`}
        >
          <div
            role="tablist"
            aria-label="Seções do editor"
            className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {abas.map((a) => (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={aba === a.id}
                onClick={() => setAba(a.id)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium ${
                  aba === a.id ? "bg-ink text-ink-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {a.rotulo}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-5 pb-24 lg:max-h-[calc(100dvh-160px)] lg:overflow-y-auto lg:pb-4 lg:pr-1">
            {aba === "conteudo" && <AbaConteudo site={rascunho} aplicar={aplicar} />}
            {aba === "secoes" && <AbaSecoes site={rascunho} aplicar={aplicar} />}
            {aba === "itens" && <AbaItens site={rascunho} aplicar={aplicar} />}
            {aba === "aparencia" && <AbaAparencia site={rascunho} aplicar={aplicar} />}
            {aba === "seo" && <AbaSeo site={rascunho} aplicar={aplicar} />}
            {aba === "versoes" && (
              <AbaVersoes
                site={rascunho}
                onRestaurar={(s) => {
                  hist.registrar(structuredClone(rascunho));
                  setRascunho(s);
                  setSujo(true);
                }}
              />
            )}
          </div>
        </aside>

        <section
          className={`min-w-0 place-items-start justify-center overflow-x-hidden bg-secondary/40 p-4 sm:p-6 lg:grid ${
            previaMovel ? "grid" : "hidden"
          }`}
        >
          {dispositivo === "celular" ? (
            <PhoneFrame altura={680} className="max-w-full">
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
        <div>
          <Texto
            rotulo="Endereço do site (slug)"
            valor={site.slug}
            onChange={(v) => aplicar((s) => ({ ...s, slug: slugify(v) }))}
          />
          <Medidor
            valor={site.slug}
            min={3}
            ideal={40}
            dica={`Ficará em /site/${site.slug || "seu-endereco"} — use apenas letras, números e hífens.`}
          />
        </div>
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

      <Bloco titulo="Logo e capa">
        <SeletorMidia
          rotulo="Logo"
          valor={site.conteudo.logo ?? ""}
          onChange={(v) => set({ logo: v })}
        />
        <SeletorMidia
          rotulo="Imagem de capa"
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
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [alvo, setAlvo] = useState<number | null>(null);

  const reordenar = (de: number, para: number) =>
    aplicar((s) => {
      if (de === para || de < 0 || para < 0 || de >= s.secoes.length || para >= s.secoes.length)
        return s;
      const secoes = [...s.secoes];
      const [item] = secoes.splice(de, 1);
      secoes.splice(para, 0, item!);
      return { ...s, secoes };
    });

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
        Ative, desative e arraste para reordenar. A prévia atualiza na hora.
      </p>
      <ul className="space-y-2">
        {site.secoes.map((sec, i) => (
          <li
            key={sec.id}
            draggable
            onDragStart={(e) => {
              setArrastando(i);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (alvo !== i) setAlvo(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (arrastando !== null) reordenar(arrastando, i);
              setArrastando(null);
              setAlvo(null);
            }}
            onDragEnd={() => {
              setArrastando(null);
              setAlvo(null);
            }}
            className={`flex items-center gap-2 rounded-xl border bg-card px-3 py-2 transition-all ${
              arrastando === i
                ? "border-lime opacity-50"
                : alvo === i
                  ? "border-lime ring-2 ring-lime/40"
                  : "border-border"
            }`}
          >
            <GripVertical
              size={14}
              className="shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
              aria-hidden
            />
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
      <BlocoLinksEditor site={site} aplicar={aplicar} />


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
            <SeletorMidia
              rotulo="Foto do produto"
              valor={p.imagem ?? ""}
              onChange={(v) =>
                aplicar((s) => ({
                  ...s,
                  produtos: s.produtos.map((x) => (x.id === p.id ? { ...x, imagem: v } : x)),
                }))
              }
            />
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={p.destaque}
                  onChange={(e) =>
                    aplicar((s) => ({
                      ...s,
                      produtos: s.produtos.map((x) =>
                        x.id === p.id ? { ...x, destaque: e.target.checked } : x,
                      ),
                    }))
                  }
                />
                destaque
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={p.disponivel}
                  onChange={(e) =>
                    aplicar((s) => ({
                      ...s,
                      produtos: s.produtos.map((x) =>
                        x.id === p.id ? { ...x, disponivel: e.target.checked } : x,
                      ),
                    }))
                  }
                />
                disponível
              </label>
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

      <BlocoGaleria site={site} aplicar={aplicar} />
      <BlocoVideosEditor site={site} aplicar={aplicar} />


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

  const dominio =
    site.integracoes.dominio?.trim()
      ? `https://${site.integracoes.dominio.replace(/^https?:\/\//, "")}`
      : typeof window !== "undefined"
        ? window.location.origin
        : `https://${hostMarca(marcaStore.get())}`;
  const url = `${dominio}/site/${site.slug}`;

  return (
    <>
      <Bloco titulo="Busca e compartilhamento">
        <div>
          <Texto rotulo="Título" valor={site.seo.titulo} onChange={(v) => set({ titulo: v })} />
          <Medidor
            valor={site.seo.titulo}
            min={15}
            ideal={60}
            dica="Títulos acima de 60 caracteres são cortados no Google e no WhatsApp."
          />
        </div>
        <div>
          <Texto
            rotulo="Descrição"
            area
            valor={site.seo.descricao}
            onChange={(v) => set({ descricao: v })}
          />
          <Medidor
            valor={site.seo.descricao}
            min={50}
            ideal={160}
            dica="A descrição ideal tem entre 50 e 160 caracteres."
          />
        </div>
        <Texto
          rotulo="Palavras-chave"
          valor={site.seo.palavras}
          onChange={(v) => set({ palavras: v })}
          placeholder="pizzaria, delivery, São Paulo"
        />
        <SeletorMidia
          rotulo="Imagem de compartilhamento"
          valor={site.seo.imagem ?? ""}
          onChange={(v) => set({ imagem: v })}
        />
      </Bloco>

      <Bloco titulo="Prévia do compartilhamento">
        <PreviaCompartilhamento site={site} dominio={dominio} />
      </Bloco>

      <Bloco titulo="Link do mini-site">
        <p className="break-all rounded-xl border border-border bg-card p-3 text-xs">{url}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(url);
              toast.success("Link copiado", { description: "Cole na bio do Instagram ou no WhatsApp." });
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
          >
            <Copy size={13} /> Copiar link
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${site.seo.titulo || site.conteudo.nome} — ${url}`)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
          >
            Compartilhar no WhatsApp
          </a>
        </div>
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

/* ------------------------------ links ------------------------------ */

const tiposLink: { id: TipoLink; rotulo: string; dica: string }[] = [
  { id: "whatsapp", rotulo: "WhatsApp", dica: "5511999998888" },
  { id: "instagram", rotulo: "Instagram", dica: "@perfil" },
  { id: "facebook", rotulo: "Facebook", dica: "pagina" },
  { id: "tiktok", rotulo: "TikTok", dica: "@perfil" },
  { id: "youtube", rotulo: "YouTube", dica: "@canal" },
  { id: "telefone", rotulo: "Telefone", dica: "(11) 99999-8888" },
  { id: "email", rotulo: "E-mail", dica: "contato@negocio.com" },
  { id: "localizacao", rotulo: "Localização", dica: "Rua, número, cidade" },
  { id: "site", rotulo: "Site", dica: "https://..." },
  { id: "personalizado", rotulo: "Personalizado", dica: "https://..." },
];

function BlocoLinksEditor({ site, aplicar }: { site: Site; aplicar: Aplicar }) {
  const atualizar = (id: string, patch: Partial<Site["links"][number]>) =>
    aplicar((s) => ({ ...s, links: s.links.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));

  const adicionar = (tipo: TipoLink) =>
    aplicar((s) => ({
      ...s,
      links: [
        ...s.links,
        {
          id: uid("lnk"),
          tipo,
          titulo: tiposLink.find((t) => t.id === tipo)?.rotulo ?? "Novo link",
          valor: tipo === "whatsapp" ? s.conteudo.whatsapp : tipo === "instagram" ? s.conteudo.instagram : "",
          ativo: true,
        },
      ],
    }));

  return (
    <Bloco titulo="Links e redes sociais">
      <p className="text-xs text-muted-foreground">
        Escolha o tipo para usar o ícone certo. WhatsApp abre a conversa com mensagem pronta e
        Instagram vai direto para o perfil.
      </p>
      {site.links.map((l) => (
        <LinhaItem
          key={l.id}
          onRemover={() => aplicar((s) => ({ ...s, links: s.links.filter((x) => x.id !== l.id) }))}
        >
          <div className="grid grid-cols-2 gap-2">
            <select
              value={l.tipo}
              onChange={(e) => atualizar(l.id, { tipo: e.target.value as TipoLink })}
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
            >
              {tiposLink.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.rotulo}
                </option>
              ))}
            </select>
            <EntradaSimples
              valor={l.titulo}
              placeholder="Título do botão"
              onChange={(v) => atualizar(l.id, { titulo: v })}
            />
          </div>
          <EntradaSimples
            valor={l.valor}
            placeholder={tiposLink.find((t) => t.id === l.tipo)?.dica ?? "URL"}
            onChange={(v) => atualizar(l.id, { valor: v })}
          />
          {l.tipo === "whatsapp" && (
            <EntradaSimples
              valor={l.mensagem ?? ""}
              placeholder="Mensagem automática ao abrir a conversa"
              onChange={(v) => atualizar(l.id, { mensagem: v })}
            />
          )}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={l.ativo}
                onChange={(e) => atualizar(l.id, { ativo: e.target.checked })}
              />
              visível
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              cor
              <input
                type="color"
                aria-label="Cor do botão"
                value={l.cor ?? "#ffffff"}
                onChange={(e) => atualizar(l.id, { cor: e.target.value })}
                className="h-7 w-9 rounded border border-border"
              />
            </label>
          </div>
        </LinhaItem>
      ))}
      <div className="flex flex-wrap gap-1.5">
        {(["whatsapp", "instagram", "facebook", "tiktok", "youtube", "personalizado"] as TipoLink[]).map(
          (t) => (
            <BotaoAdicionar
              key={t}
              rotulo={tiposLink.find((x) => x.id === t)?.rotulo ?? t}
              onClick={() => adicionar(t)}
            />
          ),
        )}
      </div>
    </Bloco>
  );
}

/* ------------------------------ galeria e vídeos ------------------------------ */

function BlocoGaleria({ site, aplicar }: { site: Site; aplicar: Aplicar }) {
  const [novo, setNovo] = useState("");
  const [tipo, setTipo] = useState<"imagem" | "video">("imagem");

  return (
    <Bloco titulo="Galeria">
      <div className="flex gap-1.5">
        {(["imagem", "video"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${tipo === t ? "bg-ink text-ink-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            {t === "imagem" ? "Foto" : "Vídeo"}
          </button>
        ))}
      </div>
      <SeletorMidia rotulo="Nova mídia" valor={novo} onChange={setNovo} tipo={tipo} />
      <BotaoAdicionar
        rotulo="Adicionar à galeria"
        onClick={() => {
          if (!novo) {
            toast.error("Escolha ou envie uma mídia primeiro.");
            return;
          }
          aplicar((s) => ({
            ...s,
            galeria: [...s.galeria, { id: uid("mid"), url: novo, titulo: tipo === "video" ? "Vídeo" : "Foto", tipo }],
          }));
          setNovo("");
        }}
      />
      {site.galeria.length > 0 && (
        <ul className="space-y-2">
          {site.galeria.map((g) => (
            <li key={g.id} className="flex items-center gap-2 text-sm">
              {g.tipo === "video" ? (
                <video src={g.url} muted className="h-8 w-8 rounded object-cover" />
              ) : (
                <img src={g.url} alt={g.titulo} className="h-8 w-8 rounded object-cover" />
              )}
              <input
                value={g.titulo}
                onChange={(e) =>
                  aplicar((s) => ({
                    ...s,
                    galeria: s.galeria.map((x) =>
                      x.id === g.id ? { ...x, titulo: e.target.value } : x,
                    ),
                  }))
                }
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
              <button
                type="button"
                aria-label="Remover mídia"
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
  );
}

function BlocoVideosEditor({ site, aplicar }: { site: Site; aplicar: Aplicar }) {
  const videos = site.videos ?? [];
  const atualizar = (id: string, patch: Partial<(typeof videos)[number]>) =>
    aplicar((s) => ({
      ...s,
      videos: (s.videos ?? []).map((v) => (v.id === id ? { ...v, ...patch } : v)),
    }));

  return (
    <Bloco titulo="Vídeos">
      <p className="text-xs text-muted-foreground">
        Envie um arquivo ou cole um link do YouTube/Vimeo. Ative a seção “Vídeos” na aba Seções.
      </p>
      {videos.map((v) => (
        <LinhaItem
          key={v.id}
          onRemover={() =>
            aplicar((s) => ({ ...s, videos: (s.videos ?? []).filter((x) => x.id !== v.id) }))
          }
        >
          <EntradaSimples
            valor={v.titulo}
            placeholder="Título do vídeo"
            onChange={(t) => atualizar(v.id, { titulo: t })}
          />
          <EntradaSimples
            valor={v.descricao ?? ""}
            placeholder="Descrição (opcional)"
            onChange={(t) => atualizar(v.id, { descricao: t })}
          />
          <SeletorMidia
            rotulo="Arquivo ou link"
            tipo="video"
            valor={v.url}
            onChange={(u) => atualizar(v.id, { url: u })}
          />
        </LinhaItem>
      ))}
      <BotaoAdicionar
        rotulo="Adicionar vídeo"
        onClick={() =>
          aplicar((s) => ({
            ...s,
            videos: [...(s.videos ?? []), { id: uid("vid"), url: "", titulo: "Novo vídeo" }],
          }))
        }
      />
    </Bloco>
  );
}

/* ------------------------------ versões ------------------------------ */

function AbaVersoes({ site, onRestaurar }: { site: Site; onRestaurar: (s: Site) => void }) {
  const versoes = useSyncExternalStore(
    versaoStore.subscribe,
    () => versaoStore.listar(site.id),
    () => [] as ReturnType<typeof versaoStore.listar>,
  );

  return (
    <Bloco titulo="Histórico de versões">
      <p className="text-xs text-muted-foreground">
        Cada publicação e cada salvamento manual cria um ponto de restauração. Restaurar substitui o
        rascunho atual — publique novamente para valer no ar.
      </p>
      <div className="flex flex-wrap gap-2">
        <BotaoAdicionar
          rotulo="Criar ponto de restauração"
          onClick={() => {
            versaoStore.registrar(site, "manual");
            toast.success("Ponto de restauração criado");
          }}
        />
        {versoes.length > 0 && (
          <button
            type="button"
            onClick={() => {
              versaoStore.limpar(site.id);
              toast.message("Histórico limpo");
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ember"
          >
            <Trash2 size={13} /> Limpar histórico
          </button>
        )}
      </div>

      {versoes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          Nenhuma versão salva ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {versoes.map((v) => (
            <li key={v.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <History size={14} className="text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{v.rotulo}</p>
                  <p className="text-xs text-muted-foreground">{dataHora(v.criadoEm)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onRestaurar(structuredClone(v.dados));
                    toast.success("Versão restaurada", { description: v.rotulo });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
                >
                  <RotateCcw size={12} /> Restaurar
                </button>
                <button
                  type="button"
                  aria-label="Excluir versão"
                  onClick={() => versaoStore.remover(site.id, v.id)}
                  className="text-ember"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Bloco>
  );
}



/** Indicador elegante de tamanho recomendado para slug, título e descrição. */
function Medidor({
  valor,
  min,
  ideal,
  dica,
}: {
  valor: string;
  min: number;
  ideal: number;
  dica: string;
}) {
  const n = valor.trim().length;
  const estado = n === 0 ? "vazio" : n < min ? "curto" : n <= ideal ? "bom" : "longo";
  const cores = {
    vazio: "bg-muted-foreground/40",
    curto: "bg-ember",
    bom: "bg-lime",
    longo: "bg-destructive",
  } as const;
  const rotulos = {
    vazio: "Preencha para melhorar o compartilhamento",
    curto: `Um pouco curto — ideal a partir de ${min}`,
    bom: "Tamanho ideal",
    longo: `Passou do limite recomendado de ${ideal}`,
  } as const;

  return (
    <div className="mt-1.5 space-y-1">
      <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all ${cores[estado]}`}
          style={{ width: `${Math.min(100, (n / ideal) * 100)}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground">{dica}</span>
        <span
          className={
            estado === "longo"
              ? "font-semibold text-destructive"
              : estado === "bom"
                ? "font-semibold text-foreground"
                : "text-muted-foreground"
          }
        >
          {n}/{ideal} · {rotulos[estado]}
        </span>
      </div>
    </div>
  );
}
