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
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Smartphone,
  Undo2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { MiniSite } from "@/components/minisite/MiniSite";
import {
  MolduraPrevia,
  SeletorDispositivo,
  type Dispositivo,
} from "@/components/editor/PreviaDispositivo";
import {
  PainelQualidade,
  destinoPorSecao,
  verificar,
  type DestinoEditor,
} from "@/components/editor/PainelQualidade";
import { BotaoRemover } from "@/components/editor/BotaoRemover";
import { SeletorMidia } from "@/components/editor/SeletorMidia";
import { NotaEstrelas } from "@/components/editor/NotaEstrelas";
import { PreviaCompartilhamento } from "@/components/editor/PreviaCompartilhamento";
import { useHistorico, useNexa } from "@/lib/nexa/hooks";
import { modelosCriacao } from "@/lib/nexa/modelos";
import { modelosUsuarioStore } from "@/lib/nexa/modelos-usuario";
import { baixarJson, lerArquivo, mesclarImportacao } from "@/lib/nexa/exportar";
import { versaoStore } from "@/lib/nexa/versoes";
import { copiarTexto, enderecoSite, origemPublica } from "@/lib/nexa/clipboard";
import { dataHora, slugify, telefoneMask, uid } from "@/lib/nexa/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { grupoDeSecao, secaoTemConteudo } from "@/lib/nexa/secoes";
import type { CampoFormulario, Site, TipoLink } from "@/lib/nexa/types";

export const Route = createFileRoute("/painel/editor/$id")({
  head: () => ({
    meta: [
      { title: "Editor visual — Nexa" },
      {
        name: "description",
        content: "Edite conteúdo, seções e aparência com prévia em tempo real.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Editor visual — Nexa" },
      { property: "og:description", content: "Personalize o mini-site e publique em um clique." },
    ],
  }),
  component: Editor,
});

type Aba = "conteudo" | "secoes" | "itens" | "aparencia" | "seo" | "qualidade" | "versoes";

const abas: { id: Aba; rotulo: string }[] = [
  { id: "conteudo", rotulo: "Conteúdo" },
  { id: "secoes", rotulo: "Seções" },
  { id: "itens", rotulo: "Itens" },
  { id: "aparencia", rotulo: "Aparência" },
  { id: "seo", rotulo: "SEO" },
  { id: "qualidade", rotulo: "Qualidade" },
  { id: "versoes", rotulo: "Versões" },
];

function Editor() {
  const { id } = Route.useParams();
  const { sites, pronto, store } = useNexa();
  const navigate = useNavigate();
  const arquivoRef = useRef<HTMLInputElement>(null);
  const painelConfiguracoesRef = useRef<HTMLDivElement>(null);

  const original = sites.find((s) => s.id === id);
  const [rascunho, setRascunho] = useState<Site | null>(null);
  const [aba, setAba] = useState<Aba>("conteudo");
  const [dispositivo, setDispositivo] = useState<Dispositivo>("celular");
  const [sujo, setSujo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvoEm, setSalvoEm] = useState<string | null>(null);
  const [autosave, setAutosave] = useState(true);
  const [previaMovel, setPreviaMovel] = useState(false);
  const [destinoPendente, setDestinoPendente] = useState<DestinoEditor | null>(null);
  const revisaoRef = useRef(0);

  useEffect(() => {
    if (original && !rascunho) setRascunho(structuredClone(original));
  }, [original, rascunho]);

  /** O editor ocupa uma tela fixa; somente seus painéis internos devem rolar. */
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const overflowHtmlAnterior = html.style.overflow;
    const overflowBodyAnterior = body.style.overflow;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = overflowHtmlAnterior;
      body.style.overflow = overflowBodyAnterior;
    };
  }, []);

  const hist = useHistorico<Site | null>(rascunho);

  /** Leva o editor até a aba e o bloco corretos, com foco visível. */
  const irPara = useCallback((destino: DestinoEditor) => {
    setDestinoPendente(destino);
    setAba(destino.aba as Aba);
    setPreviaMovel(false);
  }, []);

  /** Aguarda a nova aba ser renderizada antes de procurar e rolar até o bloco. */
  useEffect(() => {
    if (!destinoPendente || destinoPendente.aba !== aba) return;
    const frame = requestAnimationFrame(() => {
      const alvo = document.getElementById(destinoPendente.bloco);
      if (!alvo) {
        setDestinoPendente(null);
        return;
      }
      const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const controle = alvo.querySelector<HTMLElement>("[data-foco-bloco]");
      if (controle?.getAttribute("aria-expanded") === "false") controle.click();
      const painel = painelConfiguracoesRef.current;
      if (painel) {
        const topo =
          painel.scrollTop + alvo.getBoundingClientRect().top - painel.getBoundingClientRect().top;
        painel.scrollTo({
          top: Math.max(0, topo),
          behavior: reduzido ? "auto" : "smooth",
        });
      }
      controle?.focus({ preventScroll: true });
      setDestinoPendente(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [aba, destinoPendente]);

  const aplicar = (fn: (s: Site) => Site) => {
    revisaoRef.current += 1;
    setRascunho((atual) => {
      if (!atual) return atual;
      hist.registrar(structuredClone(atual));
      return fn(structuredClone(atual));
    });
    setSujo(true);
  };

  const salvar = useCallback(
    async (patch?: Partial<Site>, silencioso = false) => {
      if (!rascunho || salvando) return null;
      const proximo = { ...rascunho, ...patch };
      const revisaoSalva = revisaoRef.current;
      setRascunho(proximo);
      setSalvando(true);
      try {
        const salvo = await store.atualizarSite(rascunho.id, () => proximo);
        if (revisaoRef.current === revisaoSalva) setSujo(false);
        setSalvoEm(new Date().toISOString());
        if (!silencioso) toast.success("Alterações salvas");
        return salvo;
      } catch (error) {
        toast.error("Não foi possível salvar", {
          description: error instanceof Error ? error.message : undefined,
        });
        return null;
      } finally {
        setSalvando(false);
      }
    },
    [rascunho, salvando, store],
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
    if (!rascunho || salvando) return;
    const publicado = rascunho.status === "publicado";
    setSalvando(true);
    try {
      const salvo = publicado
        ? await store.definirStatus(rascunho, "rascunho")
        : await store.publicarSite(rascunho);
      setRascunho(salvo);
      setSujo(false);
      setSalvoEm(new Date().toISOString());
      if (!publicado) void versaoStore.registrar(salvo, "publicacao").catch(() => undefined);
      toast[publicado ? "message" : "success"](
        publicado ? "Mini-site despublicado" : "Mini-site publicado",
        {
          description: publicado
            ? "Ele voltou para rascunho."
            : `Disponível em /site/${salvo.slug}`,
        },
      );
    } catch (error) {
      toast.error(publicado ? "Não foi possível despublicar" : "Não foi possível publicar", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSalvando(false);
    }
  };

  const importar = async (arquivo?: File | null) => {
    if (!arquivo || !rascunho) return;
    try {
      const importado = lerArquivo(await arquivo.text());
      await versaoStore.registrar(rascunho, "importacao", "Antes da importação");
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
    ? {
        icone: <Loader2 size={12} className="animate-spin" />,
        texto: "salvando…",
        cor: "text-muted-foreground",
      }
    : sujo
      ? {
          icone: <span className="h-1.5 w-1.5 rounded-full bg-ember" />,
          texto: "alterações não salvas",
          cor: "text-ember",
        }
      : {
          icone: <Check size={12} />,
          texto: salvoEm ? `salvo ${dataHora(salvoEm)}` : "tudo salvo",
          cor: "text-muted-foreground",
        };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="sticky top-0 z-30 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-3 py-3 backdrop-blur-xl sm:px-4">
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
          <SeletorDispositivo
            valor={dispositivo}
            onChange={setDispositivo}
            className="hidden lg:flex"
          />
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
            onClick={async () => {
              const salvo = await salvar();
              if (salvo) void versaoStore.registrar(salvo, "salvamento").catch(() => undefined);
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

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(340px,400px)_1fr]">
        <aside
          className={`min-h-0 min-w-0 flex-col overflow-hidden border-b border-border p-4 lg:flex lg:border-b-0 lg:border-r ${
            previaMovel ? "hidden" : "flex"
          }`}
        >
          
          <div
            role="tablist"
            aria-label="Seções do editor"
            className="grid grid-cols-4 gap-1.5 pb-1"
          >
            {abas.map((a) => (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={aba === a.id}
                onClick={() => setAba(a.id)}
                className={`min-h-11 truncate rounded-full px-2 py-2 text-xs font-medium sm:text-sm ${
                  aba === a.id ? "bg-ink text-ink-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {a.rotulo}
              </button>
            ))}
          </div>

          <div
            ref={painelConfiguracoesRef}
            className="mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pb-24 pr-1 lg:pb-4"
          >
            {aba === "conteudo" && <AbaConteudo site={rascunho} aplicar={aplicar} />}
            {aba === "secoes" && <AbaSecoes site={rascunho} aplicar={aplicar} onIr={irPara} />}
            {aba === "itens" && <AbaItens site={rascunho} aplicar={aplicar} />}
            {aba === "aparencia" && <AbaAparencia site={rascunho} aplicar={aplicar} />}
            {aba === "seo" && <AbaSeo site={rascunho} aplicar={aplicar} />}
            {aba === "qualidade" && <PainelQualidade site={rascunho} onIr={irPara} />}
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
          aria-label="Prévia do mini-site"
          className={`min-h-0 min-w-0 flex-col items-center gap-4 overflow-hidden bg-secondary/40 p-4 sm:p-6 lg:flex ${
            previaMovel ? "flex" : "hidden"
          }`}
        >
          <SeletorDispositivo valor={dispositivo} onChange={setDispositivo} className="lg:hidden" />
          <MolduraPrevia dispositivo={dispositivo}>
            <MiniSite site={rascunho} botaoFlutuante={false} modoEdicao />
          </MolduraPrevia>
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

function Bloco({
  titulo,
  id,
  children,
  acao,
}: {
  titulo: string;
  id?: string;
  children: React.ReactNode;
  acao?: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(true);
  const conteudoId = id ? `${id}-conteudo` : undefined;

  return (
    <section id={id} className="surface p-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          data-foco-bloco
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-controls={conteudoId}
          className="-m-1 flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-lg p-1 text-left text-sm font-semibold hover:bg-secondary/60"
        >
          <ChevronDown
            size={15}
            aria-hidden
            className={`shrink-0 text-muted-foreground transition-transform ${aberto ? "" : "-rotate-90"}`}
          />
          <span className="min-w-0 truncate">{titulo}</span>
          <span className="sr-only">{aberto ? " — recolher bloco" : " — expandir bloco"}</span>
        </button>
        {acao}
      </div>
      <div id={conteudoId} hidden={!aberto} className="mt-3 space-y-3">
        {children}
      </div>
    </section>
  );
}

/* ------------------------------ conteúdo ------------------------------ */

function AbaConteudo({ site, aplicar }: { site: Site; aplicar: Aplicar }) {
  const set = (patch: Partial<Site["conteudo"]>) =>
    aplicar((s) => ({ ...s, conteudo: { ...s.conteudo, ...patch } }));

  return (
    <>
      <Bloco titulo="Identificação" id="bloco-identificacao">
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

      <Bloco titulo="Contato" id="bloco-contato">
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

      <Bloco titulo="Logo e capa" id="bloco-logo">
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

      <Bloco titulo="Horários" id="bloco-horarios">
        <div className="space-y-2">
          {site.conteudo.horarios.map((h, i) => (
            <div key={h.dia} className="flex flex-wrap items-center gap-2">
              <span className="w-16 shrink-0 text-sm">{h.dia}</span>
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
                className="h-9 w-[5.5rem] min-w-0 flex-1 rounded-lg border border-border bg-card px-2 text-xs disabled:opacity-40"
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
                className="h-9 w-[5.5rem] min-w-0 flex-1 rounded-lg border border-border bg-card px-2 text-xs disabled:opacity-40"
              />
              <label className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
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

function AbaSecoes({
  site,
  aplicar,
  onIr,
}: {
  site: Site;
  aplicar: Aplicar;
  onIr: (destino: DestinoEditor) => void;
}) {
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [alvo, setAlvo] = useState<number | null>(null);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");

  const reordenar = (de: number, para: number) => {
    if (de === para) return;
    aplicar((s) => {
      if (de < 0 || para < 0 || de >= s.secoes.length || para >= s.secoes.length) return s;
      const secoes = [...s.secoes];
      const [item] = secoes.splice(de, 1);
      secoes.splice(para, 0, item!);
      return { ...s, secoes };
    });
    setAviso(`Seção movida para a posição ${para + 1} de ${site.secoes.length}.`);
  };

  const mover = (i: number, delta: number) => {
    const destino = i + delta;
    if (destino < 0 || destino >= site.secoes.length) return;
    aplicar((s) => {
      const secoes = [...s.secoes];
      const atual = secoes[i]!;
      secoes[i] = secoes[destino]!;
      secoes[destino] = atual;
      return { ...s, secoes };
    });
    setAviso(
      `“${site.secoes[i]!.titulo}” agora está na posição ${destino + 1} de ${site.secoes.length}.`,
    );
  };

  const atualizar = (id: string, patch: Partial<Site["secoes"][number]>) =>
    aplicar((s) => ({
      ...s,
      secoes: s.secoes.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));

  const atualizarTitulo = (secao: Site["secoes"][number], titulo: string) =>
    aplicar((s) => ({
      ...s,
      secoes: s.secoes.map((item) => (item.id === secao.id ? { ...item, titulo } : item)),
      formulario: secao.tipo === "formulario" ? { ...s.formulario, titulo } : s.formulario,
    }));

  return (
    <Bloco titulo="Seções do mini-site" id="bloco-secoes">
      <p className="text-xs text-muted-foreground">
        Arraste pela alça ou use as setas para reordenar. Ative, desative e abra cada seção para
        renomear. A prévia atualiza na hora.
      </p>
      <p aria-live="polite" className="sr-only">
        {aviso}
      </p>
      <ul className="space-y-2">
        {site.secoes.map((sec, i) => {
          const aberta = expandida === sec.id;
          const tituloEditavel = sec.tipo !== "apresentacao" && sec.tipo !== "rodape";
          const tituloAtual = sec.tipo === "formulario" ? site.formulario.titulo : sec.titulo;
          const vazio = !secaoTemConteudo(site, sec.tipo, sec.conteudo);
          const compartilhaItens = ["produtos", "cardapio", "promocao", "cupom"].includes(sec.tipo);
          return (
            <li
              key={sec.id}
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
              className={`min-w-0 rounded-xl border bg-card transition-all ${
                arrastando === i
                  ? "border-lime opacity-50"
                  : alvo === i
                    ? "border-lime ring-2 ring-lime/40"
                    : "border-border"
              } ${sec.ativa ? "" : "opacity-70"}`}
            >
              <div className="flex min-w-0 items-center gap-1.5 px-2 py-2">
                <span
                  draggable
                  onDragStart={(e) => {
                    setArrastando(i);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {
                    setArrastando(null);
                    setAlvo(null);
                  }}
                  title="Arraste para reordenar"
                  aria-hidden
                  className="grid h-9 w-5 shrink-0 cursor-grab place-items-center text-muted-foreground active:cursor-grabbing"
                >
                  <GripVertical size={14} />
                </span>

                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    aria-label={`Mover “${sec.titulo}” para cima`}
                    title="Mover para cima"
                    disabled={i === 0}
                    onClick={() => mover(i, -1)}
                    className="grid h-5 w-6 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Mover “${sec.titulo}” para baixo`}
                    title="Mover para baixo"
                    disabled={i === site.secoes.length - 1}
                    onClick={() => mover(i, 1)}
                    className="grid h-5 w-6 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandida(aberta ? null : sec.id)}
                  aria-expanded={aberta}
                  aria-controls={`secao-${sec.id}`}
                  className="flex min-h-9 min-w-0 flex-1 items-center gap-1.5 rounded-lg px-1 text-left hover:bg-secondary/60"
                >
                  <ChevronDown
                    size={13}
                    aria-hidden
                    className={`shrink-0 text-muted-foreground transition-transform ${aberta ? "" : "-rotate-90"}`}
                  />
                  <span className="min-w-0 truncate text-sm font-medium">{sec.titulo}</span>
                  <span className="sr-only">
                    , posição {i + 1} de {site.secoes.length}
                  </span>
                </button>

                <button
                  type="button"
                  role="switch"
                  aria-checked={sec.ativa}
                  aria-label={`Seção “${sec.titulo}” ${sec.ativa ? "visível" : "oculta"}`}
                  title={sec.ativa ? "Desativar seção" : "Ativar seção"}
                  onClick={() => atualizar(sec.id, { ativa: !sec.ativa })}
                  className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
                    sec.ativa ? "border-lime bg-lime" : "border-border bg-secondary"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-card shadow transition-all ${
                      sec.ativa ? "left-[1.4rem]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              <div id={`secao-${sec.id}`} hidden={!aberta} className="space-y-2 px-3 pb-3">
                {tituloEditavel ? (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">
                      Título exibido
                    </span>
                    <input
                      value={tituloAtual}
                      onChange={(e) => atualizarTitulo(sec, e.target.value)}
                      className="h-10 w-full min-w-0 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-ink"
                    />
                  </label>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {sec.tipo === "apresentacao"
                      ? "Nome, descrição e imagens são editados em Conteúdo."
                      : "Os dados do rodapé são editados em Conteúdo."}
                  </p>
                )}
                {sec.tipo === "livre" && (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">
                      Texto do bloco
                    </span>
                    <textarea
                      value={sec.conteudo ?? ""}
                      rows={5}
                      placeholder="Escreva o texto deste bloco. Deixe uma linha em branco para separar parágrafos."
                      onChange={(e) => atualizar(sec.id, { conteudo: e.target.value })}
                      className="w-full min-w-0 rounded-lg border border-border bg-background p-2.5 text-sm outline-none focus:border-ink"
                    />
                  </label>
                )}
                {sec.ativa && vazio && sec.tipo !== "livre" && (
                  <p className="rounded-lg bg-secondary px-2.5 py-2 text-xs text-muted-foreground">
                    Esta seção está ativa, mas ainda não possui itens. Use o botão abaixo para
                    adicionar conteúdo.
                  </p>
                )}
                {compartilhaItens && (
                  <p className="text-xs text-muted-foreground">
                    {grupoDeSecao(sec.tipo) === "produtos"
                      ? "Produtos e Cardápio usam a mesma lista de itens."
                      : "Promoção e Cupom usam a mesma lista de cupons."}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-secondary px-2 py-1 text-[11px] text-muted-foreground">
                    {sec.ativa ? "Visível no site" : "Oculta no site"}
                  </span>
                  {sec.tipo !== "livre" && (
                    <button
                      type="button"
                      onClick={() => onIr(destinoPorSecao[sec.tipo])}
                      className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold hover:bg-secondary"
                    >
                      Editar conteúdo desta seção
                    </button>
                  )}
                  {sec.tipo === "livre" && (
                    <BotaoRemover
                      rotulo="Remover bloco"
                      descricao="Remover este bloco livre e o texto dele?"
                      onConfirmar={() =>
                        aplicar((s) => ({
                          ...s,
                          secoes: s.secoes.filter((item) => item.id !== sec.id),
                        }))
                      }
                    />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <BotaoAdicionar
        rotulo="Adicionar bloco livre de texto"
        onClick={() => {
          const novo = {
            id: uid("sec"),
            tipo: "livre" as const,
            titulo: "Novo bloco",
            ativa: true,
            conteudo: "",
          };
          aplicar((s) => {
            const rodape = s.secoes.findIndex((x) => x.tipo === "rodape");
            const secoes = [...s.secoes];
            secoes.splice(rodape >= 0 ? rodape : secoes.length, 0, novo);
            return { ...s, secoes };
          });
          setExpandida(novo.id);
        }}
      />
      <p className="text-xs text-muted-foreground">
        Blocos livres aceitam qualquer texto e podem ser reordenados, renomeados e removidos.
      </p>
    </Bloco>
  );
}

/* ------------------------------ itens ------------------------------ */

function LinhaItem({ children, onRemover }: { children: React.ReactNode; onRemover: () => void }) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3">
      {children}
      <BotaoRemover onConfirmar={onRemover} descricao="Remover este item?" />
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

/** Bloco organizado de um depoimento: foto, nome, comentário, nota e destaque. */
function EditorDepoimento({ d, aplicar }: { d: Site["depoimentos"][number]; aplicar: Aplicar }) {
  const atualizar = (mudanca: Partial<Site["depoimentos"][number]>) =>
    aplicar((s) => ({
      ...s,
      depoimentos: s.depoimentos.map((x) => (x.id === d.id ? { ...x, ...mudanca } : x)),
    }));

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground" htmlFor={`dep-${d.id}`}>
            Nome do cliente
          </label>
          <input
            id={`dep-${d.id}`}
            value={d.nome}
            placeholder="Nome do cliente"
            onChange={(e) => atualizar({ nome: e.target.value })}
            className="h-11 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-ink"
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <span className="block text-xs font-semibold text-muted-foreground">Foto do cliente</span>
          <SeletorMidia
            rotulo="Foto do cliente"
            valor={d.foto ?? ""}
            onChange={(valor) =>
              aplicar((s) => ({
                ...s,
                depoimentos: s.depoimentos.map((item) => {
                  if (item.id !== d.id) return item;
                  const { foto: _anterior, ...restante } = item;
                  return valor ? { ...restante, foto: valor } : restante;
                }),
              }))
            }
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          className="text-xs font-semibold text-muted-foreground"
          htmlFor={`dep-comentario-${d.id}`}
        >
          Comentário
        </label>
        <textarea
          id={`dep-comentario-${d.id}`}
          value={d.comentario}
          rows={3}
          placeholder="O que o cliente falou sobre o atendimento"
          onChange={(e) => atualizar({ comentario: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-ink"
        />
      </div>

      <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
        <div className="min-w-0 space-y-1">
          <span className="block text-xs font-semibold text-muted-foreground">Nota</span>
          <NotaEstrelas
            nota={d.nota}
            nomeGrupo={`nota-depoimento-${d.id}`}
            onChange={(nota) => atualizar({ nota })}
          />
        </div>
        <div className="min-w-0">
          <label className="flex min-h-11 items-start gap-2 rounded-lg border border-border p-2.5">
            <input
              type="checkbox"
              checked={d.destaque}
              onChange={(e) => atualizar({ destaque: e.target.checked })}
              className="mt-0.5 h-5 w-5 shrink-0 accent-current"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Mostrar em destaque</span>
              <span className="block text-xs text-muted-foreground">
                Aparece primeiro na seção de depoimentos do mini-site.
              </span>
            </span>
          </label>
        </div>
      </div>

      <BotaoRemover
        onConfirmar={() =>
          aplicar((s) => ({
            ...s,
            depoimentos: s.depoimentos.filter((x) => x.id !== d.id),
          }))
        }
        descricao="Remover este depoimento?"
      />
    </div>
  );
}

function AbaItens({ site, aplicar }: { site: Site; aplicar: Aplicar }) {
  return (
    <>
      <BlocoLinksEditor site={site} aplicar={aplicar} />

      <Bloco titulo="Produtos" id="bloco-produtos">
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
            <div className="grid grid-cols-2 gap-2">
              <EntradaSimples
                valor={p.precoPromocional ? String(p.precoPromocional) : ""}
                placeholder="Preço promocional"
                onChange={(v) =>
                  aplicar((s) => ({
                    ...s,
                    produtos: s.produtos.map((x) => {
                      if (x.id !== p.id) return x;
                      const { precoPromocional: _antigo, ...resto } = x;
                      const valor = v.trim() ? Number(v.replace(",", ".")) || 0 : 0;
                      return valor > 0 ? { ...resto, precoPromocional: valor } : resto;
                    }),
                  }))
                }
              />
              <EntradaSimples
                valor={p.variacoes.join(", ")}
                placeholder="Variações (P, M, G)"
                onChange={(v) =>
                  aplicar((s) => ({
                    ...s,
                    produtos: s.produtos.map((x) =>
                      x.id === p.id
                        ? {
                            ...x,
                            variacoes: v
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean),
                          }
                        : x,
                    ),
                  }))
                }
              />
            </div>
            {p.precoPromocional && p.precoPromocional > 0 && p.precoPromocional < p.preco ? (
              <p className="text-xs text-muted-foreground">
                Promoção de {Math.round((1 - p.precoPromocional / p.preco) * 100)}% aparece no
                mini-site.
              </p>
            ) : null}
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

      <Bloco titulo="Serviços" id="bloco-servicos">
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
            <EntradaSimples
              valor={sv.profissional ?? ""}
              placeholder="Profissional responsável"
              onChange={(v) =>
                aplicar((s) => ({
                  ...s,
                  servicos: s.servicos.map((x) => {
                    if (x.id !== sv.id) return x;
                    const { profissional: _antigo, ...resto } = x;
                    return v.trim() ? { ...resto, profissional: v } : resto;
                  }),
                }))
              }
            />
            <SeletorMidia
              rotulo="Foto do serviço"
              valor={sv.imagem ?? ""}
              onChange={(v) =>
                aplicar((s) => ({
                  ...s,
                  servicos: s.servicos.map((x) => {
                    if (x.id !== sv.id) return x;
                    const { imagem: _antiga, ...resto } = x;
                    return v ? { ...resto, imagem: v } : resto;
                  }),
                }))
              }
            />
          </LinhaItem>
        ))}
        <BotaoAdicionar
          rotulo="Adicionar serviço"
          onClick={() =>
            aplicar((s) => ({
              ...s,
              servicos: [
                ...s.servicos,
                {
                  id: uid("srv"),
                  nome: "Novo serviço",
                  descricao: "",
                  duracao: "30 min",
                  preco: 0,
                },
              ],
            }))
          }
        />
      </Bloco>

      <BlocoGaleria site={site} aplicar={aplicar} />
      <BlocoVideosEditor site={site} aplicar={aplicar} />

      <Bloco titulo="Depoimentos" id="bloco-depoimentos">
        {site.depoimentos.map((d) => (
          <EditorDepoimento key={d.id} d={d} aplicar={aplicar} />
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

      <Bloco titulo="Equipe" id="bloco-equipe">
        {site.equipe.map((m) => (
          <LinhaItem
            key={m.id}
            onRemover={() =>
              aplicar((s) => ({ ...s, equipe: s.equipe.filter((x) => x.id !== m.id) }))
            }
          >
            <div className="grid grid-cols-2 gap-2">
              <EntradaSimples
                valor={m.nome}
                placeholder="Nome"
                onChange={(v) =>
                  aplicar((s) => ({
                    ...s,
                    equipe: s.equipe.map((x) => (x.id === m.id ? { ...x, nome: v } : x)),
                  }))
                }
              />
              <EntradaSimples
                valor={m.funcao}
                placeholder="Função"
                onChange={(v) =>
                  aplicar((s) => ({
                    ...s,
                    equipe: s.equipe.map((x) => (x.id === m.id ? { ...x, funcao: v } : x)),
                  }))
                }
              />
            </div>
            <SeletorMidia
              rotulo="Foto"
              valor={m.foto ?? ""}
              onChange={(v) =>
                aplicar((s) => ({
                  ...s,
                  equipe: s.equipe.map((x) => {
                    if (x.id !== m.id) return x;
                    const { foto: _antiga, ...resto } = x;
                    return v ? { ...resto, foto: v } : resto;
                  }),
                }))
              }
            />
          </LinhaItem>
        ))}
        <BotaoAdicionar
          rotulo="Adicionar pessoa"
          onClick={() =>
            aplicar((s) => ({
              ...s,
              equipe: [...s.equipe, { id: uid("eqp"), nome: "Novo integrante", funcao: "" }],
            }))
          }
        />
      </Bloco>

      <Bloco titulo="Cupons e promoções" id="bloco-cupons">
        {site.cupons.map((c) => (
          <LinhaItem
            key={c.id}
            onRemover={() =>
              aplicar((s) => ({ ...s, cupons: s.cupons.filter((x) => x.id !== c.id) }))
            }
          >
            <EntradaSimples
              valor={c.titulo}
              placeholder="Título (ex.: 10% na primeira compra)"
              onChange={(v) =>
                aplicar((s) => ({
                  ...s,
                  cupons: s.cupons.map((x) => (x.id === c.id ? { ...x, titulo: v } : x)),
                }))
              }
            />
            <EntradaSimples
              valor={c.descricao}
              placeholder="Descrição / regras"
              onChange={(v) =>
                aplicar((s) => ({
                  ...s,
                  cupons: s.cupons.map((x) => (x.id === c.id ? { ...x, descricao: v } : x)),
                }))
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <EntradaSimples
                valor={c.codigo}
                placeholder="Código"
                onChange={(v) =>
                  aplicar((s) => ({
                    ...s,
                    cupons: s.cupons.map((x) =>
                      x.id === c.id ? { ...x, codigo: v.toUpperCase() } : x,
                    ),
                  }))
                }
              />
              <EntradaSimples
                valor={c.validade}
                placeholder="Validade (ex.: 31/12)"
                onChange={(v) =>
                  aplicar((s) => ({
                    ...s,
                    cupons: s.cupons.map((x) => (x.id === c.id ? { ...x, validade: v } : x)),
                  }))
                }
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={c.ativo}
                onChange={(e) =>
                  aplicar((s) => ({
                    ...s,
                    cupons: s.cupons.map((x) =>
                      x.id === c.id ? { ...x, ativo: e.target.checked } : x,
                    ),
                  }))
                }
              />
              cupom ativo
            </label>
          </LinhaItem>
        ))}
        <BotaoAdicionar
          rotulo="Adicionar cupom"
          onClick={() =>
            aplicar((s) => ({
              ...s,
              cupons: [
                ...s.cupons,
                {
                  id: uid("cup"),
                  titulo: "Novo cupom",
                  descricao: "",
                  codigo: "NEXA10",
                  validade: "",
                  ativo: true,
                },
              ],
            }))
          }
        />
      </Bloco>

      <Bloco titulo="Perguntas frequentes" id="bloco-faq">
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

      <Bloco titulo="Formulário" id="bloco-formulario">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Tipo do formulário
            <select
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              value={site.formulario.tipo}
              onChange={(e) =>
                aplicar((s) => ({
                  ...s,
                  formulario: {
                    ...s.formulario,
                    tipo: e.target.value as Site["formulario"]["tipo"],
                  },
                }))
              }
            >
              <option value="orcamento">Orçamento</option>
              <option value="contato">Contato</option>
              <option value="reserva">Reserva</option>
              <option value="agendamento">Agendamento</option>
              <option value="cotacao">Cotação</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Título exibido
            <input
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              value={site.formulario.titulo}
              onChange={(e) =>
                aplicar((s) => ({
                  ...s,
                  formulario: { ...s.formulario, titulo: e.target.value },
                }))
              }
            />
          </label>
        </div>

        {site.formulario.campos.map((c) => (
          <LinhaItem
            key={c.id}
            onRemover={() =>
              aplicar((s) => ({
                ...s,
                formulario: {
                  ...s.formulario,
                  campos: s.formulario.campos.filter((x) => x.id !== c.id),
                },
              }))
            }
          >
            <EntradaSimples
              valor={c.rotulo}
              placeholder="Rótulo do campo"
              onChange={(v) =>
                aplicar((s) => ({
                  ...s,
                  formulario: {
                    ...s.formulario,
                    campos: s.formulario.campos.map((x) =>
                      x.id === c.id ? { ...x, rotulo: v } : x,
                    ),
                  },
                }))
              }
            />
            <div className="flex flex-wrap items-center gap-3">
              <select
                aria-label={`Tipo do campo ${c.rotulo}`}
                className="h-11 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                value={c.tipo}
                onChange={(e) =>
                  aplicar((s) => ({
                    ...s,
                    formulario: {
                      ...s.formulario,
                      campos: s.formulario.campos.map((x) =>
                        x.id === c.id
                          ? { ...x, tipo: e.target.value as CampoFormulario["tipo"] }
                          : x,
                      ),
                    },
                  }))
                }
              >
                <option value="texto">Texto</option>
                <option value="email">E-mail</option>
                <option value="telefone">Telefone</option>
                <option value="data">Data</option>
                <option value="textarea">Texto longo</option>
              </select>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={c.obrigatorio}
                  onChange={(e) =>
                    aplicar((s) => ({
                      ...s,
                      formulario: {
                        ...s.formulario,
                        campos: s.formulario.campos.map((x) =>
                          x.id === c.id ? { ...x, obrigatorio: e.target.checked } : x,
                        ),
                      },
                    }))
                  }
                />
                obrigatório
              </label>
            </div>
          </LinhaItem>
        ))}
        <BotaoAdicionar
          rotulo="Adicionar campo"
          onClick={() =>
            aplicar((s) => ({
              ...s,
              formulario: {
                ...s.formulario,
                campos: [
                  ...s.formulario.campos,
                  { id: uid("cmp"), rotulo: "Novo campo", tipo: "texto", obrigatorio: false },
                ],
              },
            }))
          }
        />
        <p className="text-xs text-muted-foreground">
          Os campos definem apenas o formulário exibido no mini-site. O envio continua sendo tratado
          pela integração já existente.
        </p>
      </Bloco>
    </>
  );
}

/* ------------------------------ aparência ------------------------------ */

/** Modelos próprios salvos neste navegador a partir da aparência atual. */
function MeusModelos({ site, aplicar }: { site: Site; aplicar: Aplicar }) {
  const meus = useSyncExternalStore(
    modelosUsuarioStore.subscribe,
    modelosUsuarioStore.get,
    modelosUsuarioStore.getServer,
  );
  const [nome, setNome] = useState("");

  return (
    <Bloco titulo="Meus modelos">
      <div className="flex flex-wrap gap-2">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do meu modelo"
          aria-label="Nome do meu modelo"
          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            modelosUsuarioStore.salvar(nome || site.conteudo.nome || "Meu modelo", site.aparencia);
            setNome("");
            toast.success("Modelo salvo", {
              description: "Disponível para aplicar em outros projetos neste navegador.",
            });
          }}
          className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-semibold text-ink-foreground"
        >
          Salvar visual atual
        </button>
      </div>

      {meus.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Salve a combinação de cores, fonte e formas deste projeto para reutilizar como padrão nos
          próximos mini-sites.
        </p>
      ) : (
        <ul className="space-y-2">
          {meus.map((m) => (
            <li key={m.id} className="flex items-center gap-2 rounded-xl border border-border p-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.nome}</span>
              <button
                type="button"
                onClick={() =>
                  aplicar((s) => ({ ...s, aparencia: { ...s.aparencia, ...m.aparencia } }))
                }
                className="min-h-11 rounded-full border border-border px-3 text-xs font-semibold hover:bg-secondary"
              >
                Aplicar
              </button>
              <button
                type="button"
                onClick={() => modelosUsuarioStore.remover(m.id)}
                className="min-h-11 rounded-full border border-border px-3 text-xs font-semibold hover:bg-secondary"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </Bloco>
  );
}

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
          {modelosCriacao.map((m) => (
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
              className={`min-h-11 rounded-lg border px-2.5 py-2 text-left text-xs font-medium ${
                site.modeloId === m.id ? "border-ink ring-2 ring-lime" : "border-border"
              }`}
            >
              {m.nome}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Trocar o modelo base ajusta cores e layout. O conteúdo já cadastrado permanece.
        </p>
        <button
          type="button"
          onClick={() => {
            const base = modelosCriacao.find((m) => m.id === site.modeloId);
            const nome = `${base?.nome ?? site.conteudo.nome} (minha versão)`;
            modelosUsuarioStore.salvar(nome, site.aparencia);
            toast.success("Modelo duplicado", {
              description: `“${nome}” salvo em Meus modelos. Ajuste as opções abaixo para personalizar.`,
            });
          }}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary"
        >
          Duplicar e personalizar este modelo
        </button>
      </Bloco>

      <MeusModelos site={site} aplicar={aplicar} />

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
            <option value="gradiente">Gradiente</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Altura da capa</span>
          <select
            value={a.capaAltura ?? "media"}
            onChange={(e) =>
              set({ capaAltura: e.target.value as NonNullable<Site["aparencia"]["capaAltura"]> })
            }
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
          >
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Ícone de perfil</span>
          <select
            value={a.logoFormato ?? "redondo"}
            onChange={(e) =>
              set({ logoFormato: e.target.value as NonNullable<Site["aparencia"]["logoFormato"]> })
            }
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
          >
            <option value="redondo">Redondo</option>
            <option value="quadrado">Quadrado</option>
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

  const dominio = origemPublica() || "https://seu-dominio.com.br";
  const url = enderecoSite(site.slug, dominio);

  return (
    <>
      <Bloco titulo="Busca e compartilhamento" id="bloco-seo">
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
            onClick={async () => {
              const copiado = await copiarTexto(url);
              if (copiado) {
                toast.success("Link copiado", {
                  description: "Cole na bio do Instagram ou no WhatsApp.",
                });
              } else {
                toast.error("Não foi possível copiar", {
                  description: "O navegador bloqueou o acesso à área de transferência.",
                });
              }
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

      <Bloco titulo="Integrações futuras">
        <Texto
          rotulo="Google Analytics (em breve)"
          valor={site.integracoes.googleAnalytics}
          onChange={(v) => setInt({ googleAnalytics: v })}
          placeholder="G-XXXXXXX"
        />
        <Texto
          rotulo="Meta Pixel (em breve)"
          valor={site.integracoes.metaPixel}
          onChange={(v) => setInt({ metaPixel: v })}
        />
        <Texto
          rotulo="Domínio próprio (em breve)"
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
          valor:
            tipo === "whatsapp"
              ? s.conteudo.whatsapp
              : tipo === "instagram"
                ? s.conteudo.instagram
                : "",
          ativo: true,
        },
      ],
    }));

  return (
    <Bloco titulo="Links e redes sociais" id="bloco-links">
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
        {(
          ["whatsapp", "instagram", "facebook", "tiktok", "youtube", "personalizado"] as TipoLink[]
        ).map((t) => (
          <BotaoAdicionar
            key={t}
            rotulo={tiposLink.find((x) => x.id === t)?.rotulo ?? t}
            onClick={() => adicionar(t)}
          />
        ))}
      </div>
    </Bloco>
  );
}

/* ------------------------------ galeria e vídeos ------------------------------ */

function BlocoGaleria({ site, aplicar }: { site: Site; aplicar: Aplicar }) {
  const [novo, setNovo] = useState("");
  const [tipo, setTipo] = useState<"imagem" | "video">("imagem");

  return (
    <Bloco titulo="Galeria" id="bloco-galeria">
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
            galeria: [
              ...s.galeria,
              { id: uid("mid"), url: novo, titulo: tipo === "video" ? "Vídeo" : "Foto", tipo },
            ],
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
              <BotaoRemover
                descricao="Remover esta mídia?"
                onConfirmar={() =>
                  aplicar((s) => ({ ...s, galeria: s.galeria.filter((x) => x.id !== g.id) }))
                }
              />
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
    <Bloco titulo="Vídeos" id="bloco-videos">
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
    versaoStore.snapshotVazio,
  );

  useEffect(() => {
    void versaoStore.carregar(site.id).catch((error: unknown) =>
      toast.error("Não foi possível carregar o histórico", {
        description: error instanceof Error ? error.message : undefined,
      }),
    );
  }, [site.id]);

  return (
    <Bloco titulo="Histórico de versões">
      <p className="text-xs text-muted-foreground">
        Cada publicação e cada salvamento manual cria um ponto de restauração. Restaurar substitui o
        rascunho atual — publique novamente para valer no ar.
      </p>
      <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-3">
        <p className="text-xs font-semibold">Rascunho atual (ao vivo)</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {site.conteudo.nome || "Sem nome"} · {site.secoes.filter((x) => x.ativa).length} seções
          ativas · atualizado em {dataHora(site.atualizadoEm)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <BotaoAdicionar
          rotulo="Criar ponto de restauração"
          onClick={() => {
            void versaoStore
              .registrar(site, "manual")
              .then(() => toast.success("Ponto de restauração criado"))
              .catch((error: unknown) =>
                toast.error("Não foi possível criar o ponto", {
                  description: error instanceof Error ? error.message : undefined,
                }),
              );
          }}
        />
        {versoes.length > 0 && (
          <BotaoRemover
            rotulo="Limpar histórico"
            descricao="Apagar todas as versões salvas?"
            onConfirmar={() => {
              void versaoStore
                .limpar(site.id)
                .then(() => toast.message("Histórico limpo"))
                .catch((error: unknown) =>
                  toast.error("Não foi possível limpar", {
                    description: error instanceof Error ? error.message : undefined,
                  }),
                );
            }}
          />
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
                <BotaoRemover
                  rotulo="Excluir"
                  descricao="Excluir esta versão?"
                  onConfirmar={() =>
                    void versaoStore.remover(site.id, v.id).catch((error: unknown) =>
                      toast.error("Não foi possível excluir", {
                        description: error instanceof Error ? error.message : undefined,
                      }),
                    )
                  }
                />
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
