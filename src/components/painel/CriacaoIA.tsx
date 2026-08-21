import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Loader2, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { criarSite } from "@/lib/nexa/factory";
import { gerarPlanoSite } from "@/lib/nexa/ia.functions";
import { aplicarPlanoIA } from "@/lib/nexa/ia-aplicar";
import { buscarPlanoEmCache, guardarPlanoEmCache } from "@/lib/nexa/ia-cache";
import { ESTILOS_IA, type EstiloIA, type PlanoIA, type TemaIA } from "@/lib/nexa/ia-tipos";
import { RevisaoIA } from "@/components/painel/RevisaoIA";
import { enviarArquivo } from "@/lib/nexa/media";
import { uid } from "@/lib/nexa/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Cliente, ItemVideo, MembroEquipe, Site } from "@/lib/nexa/types";

/**
 * Criação automática: a pessoa descreve o negócio, envia fotos e a IA
 * monta seções, itens, textos e paleta do mini-site.
 */
export function CriacaoIA({
  cliente,
  slug,
  desabilitado,
  onCriar,
  briefingInicial = "",
}: {
  cliente: Cliente;
  slug: string;
  desabilitado?: string;
  onCriar: (site: Site) => Promise<void>;
  briefingInicial?: string;
}) {
  const entradaProdutos = useRef<HTMLInputElement>(null);
  const entradaLogo = useRef<HTMLInputElement>(null);
  const entradaCapa = useRef<HTMLInputElement>(null);
  const entradaGaleria = useRef<HTMLInputElement>(null);
  const entradaEquipe = useRef<HTMLInputElement>(null);
  const entradaVideo = useRef<HTMLInputElement>(null);
  const gerar = useServerFn(gerarPlanoSite);
  const [descricao, setDescricao] = useState(briefingInicial);
  const [capa, setCapa] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [fotosProdutos, setFotosProdutos] = useState<string[]>([]);
  const [fotosGaleria, setFotosGaleria] = useState<string[]>([]);
  const [equipe, setEquipe] = useState<MembroEquipe[]>([]);
  const [videos, setVideos] = useState<ItemVideo[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [estilo, setEstilo] = useState<EstiloIA>("automatico");
  const [tema, setTema] = useState<TemaIA>("automatico");
  const [plano, setPlano] = useState<PlanoIA | null>(null);

  const enviarImagens = async (
    arquivos: FileList | null,
    adicionar: (urls: string[]) => void,
    limite: number,
  ) => {
    if (!arquivos?.length) return;
    setEnviando(true);
    try {
      const novas: string[] = [];
      for (const arquivo of Array.from(arquivos).slice(0, limite)) {
        const midia = await enviarArquivo(arquivo);
        novas.push(midia.url);
      }
      adicionar(novas);
    } catch (e) {
      toast.error("Falha no envio da imagem", { description: (e as Error).message });
    } finally {
      setEnviando(false);
    }
  };

  const enviarLogo = async (arquivo: File | null) => {
    if (!arquivo) return;
    setEnviando(true);
    try {
      setLogo((await enviarArquivo(arquivo)).url);
    } catch (e) {
      toast.error("Falha no envio da logo", { description: (e as Error).message });
    } finally {
      setEnviando(false);
      if (entradaLogo.current) entradaLogo.current.value = "";
    }
  };

  const enviarCapa = async (arquivo: File | null) => {
    if (!arquivo) return;
    setEnviando(true);
    try {
      setCapa((await enviarArquivo(arquivo)).url);
    } catch (e) {
      toast.error("Falha no envio da capa", { description: (e as Error).message });
    } finally {
      setEnviando(false);
      if (entradaCapa.current) entradaCapa.current.value = "";
    }
  };

  const enviarFotosEquipe = async (arquivos: FileList | null) => {
    await enviarImagens(
      arquivos,
      (urls) =>
        setEquipe((atual) =>
          [
            ...atual,
            ...urls.map((foto) => ({ id: uid("equipe"), nome: "", funcao: "", foto })),
          ].slice(0, 8),
        ),
      8,
    );
    if (entradaEquipe.current) entradaEquipe.current.value = "";
  };

  const enviarVideos = async (arquivos: FileList | null) => {
    if (!arquivos?.length) return;
    setEnviando(true);
    try {
      const novos: ItemVideo[] = [];
      for (const arquivo of Array.from(arquivos).slice(0, 4)) {
        const midia = await enviarArquivo(arquivo);
        if (midia.tipo !== "video") throw new Error("Escolha um vídeo MP4 ou WebM.");
        novos.push({
          id: uid("video"),
          url: midia.url,
          titulo: arquivo.name.replace(/\.[^.]+$/, ""),
        });
      }
      setVideos((atual) => [...atual, ...novos].slice(0, 4));
    } catch (e) {
      toast.error("Falha no envio do vídeo", { description: (e as Error).message });
    } finally {
      setEnviando(false);
      if (entradaVideo.current) entradaVideo.current.value = "";
    }
  };

  const revisar = async () => {
    if (desabilitado) {
      toast.error(desabilitado);
      return;
    }
    if (descricao.trim().length < 10) {
      toast.error("Descreva o negócio com um pouco mais de detalhe.");
      return;
    }
    setGerando(true);
    try {
      const entrada = {
        empresa: cliente.empresa,
        nicho: descricao.trim(),
        cidade: cliente.cidade,
        estado: cliente.estado,
        ...(logo ? { logo } : {}),
        ...(capa ? { capa } : {}),
        imagens: [
          ...fotosProdutos,
          ...fotosGaleria,
          ...equipe.flatMap((membro) => (membro.foto ? [membro.foto] : [])),
        ],
        estilo,
        tema,
      };
      const emCache = await buscarPlanoEmCache(entrada);
      if (emCache) {
        setPlano(emCache);
        toast.message("Sugestão recuperada do cache", {
          description: "Nenhum crédito de IA foi consumido.",
        });
        return;
      }
      const { data: sessao } = await supabase.auth.getSession();
      if (!sessao.session?.access_token) {
        throw new Error("Entre na sua conta para usar a criação com IA.");
      }
      const sugestao = await gerar({ data: { entrada, accessToken: sessao.session.access_token } });
      void guardarPlanoEmCache(entrada, sugestao);
      setPlano(sugestao);
    } catch (e) {
      toast.error("Não foi possível gerar a sugestão", { description: (e as Error).message });
    } finally {
      setGerando(false);
    }
  };

  const criarAprovado = async (aprovado: PlanoIA) => {
    setCriando(true);
    try {
      const base = criarSite(
        { ...cliente, segmento: aprovado.segmento ?? cliente.segmento },
        "personalizado",
        slug,
      );
      await onCriar(
        aplicarPlanoIA(base, aprovado, [], { estilo, tema }, logo ?? undefined, {
          ...(capa ? { capa } : {}),
          produtos: fotosProdutos,
          galeria: fotosGaleria,
          equipe: equipe.filter((membro) => membro.nome.trim()),
          videos,
        }),
      );
    } catch (e) {
      toast.error("Não foi possível criar o mini-site", { description: (e as Error).message });
    } finally {
      setCriando(false);
    }
  };

  return (
    <div className="surface border-ink/20 p-5 sm:p-6">
      <div className="mb-3 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-ink-foreground"
          aria-hidden="true"
        >
          <Sparkles size={16} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold">Criação automática com IA</h2>
          <p className="text-xs text-muted-foreground">
            A IA cria uma primeira versão baseada na descrição, fotos, logo e segmento; você pode
            editar tudo depois.
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-dashed border-border p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          O que melhora o resultado
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {[
            "Descrição do negócio",
            "Logo",
            "Fotos reais",
            "Serviços/produtos",
            "Contato",
          ].map((item) => (
            <li
              key={item}
              className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      {desabilitado && <AvisoPlano motivo="sem-ia" mensagem={desabilitado} className="mb-4" />}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">O que o negócio faz</span>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={3}
          placeholder="Ex.: barbearia masculina com corte, barba e produtos próprios, atendimento com hora marcada."
          className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-ink"
        />
        <span className="mt-1 block text-xs text-muted-foreground">
          Mínimo de 10 caracteres. Quanto mais específico, melhor a sugestão.
        </span>
      </label>


      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <input
          ref={entradaLogo}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => void enviarLogo(e.target.files?.[0] ?? null)}
        />
        <input
          ref={entradaCapa}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => void enviarCapa(e.target.files?.[0] ?? null)}
        />
        <input
          ref={entradaProdutos}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) =>
            void enviarImagens(
              e.target.files,
              (urls) => setFotosProdutos((atual) => [...atual, ...urls].slice(0, 8)),
              8,
            ).finally(() => {
              if (entradaProdutos.current) entradaProdutos.current.value = "";
            })
          }
        />
        <input
          ref={entradaGaleria}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) =>
            void enviarImagens(
              e.target.files,
              (urls) => setFotosGaleria((atual) => [...atual, ...urls].slice(0, 12)),
              12,
            ).finally(() => {
              if (entradaGaleria.current) entradaGaleria.current.value = "";
            })
          }
        />
        <input
          ref={entradaEquipe}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => void enviarFotosEquipe(e.target.files)}
        />
        <input
          ref={entradaVideo}
          type="file"
          accept="video/mp4,video/webm"
          multiple
          className="sr-only"
          onChange={(e) => void enviarVideos(e.target.files)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => entradaLogo.current?.click()}
            disabled={enviando}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
          >
            {enviando ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
            Logo
          </button>
          <button
            type="button"
            onClick={() => entradaCapa.current?.click()}
            disabled={enviando}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
          >
            {enviando ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
            Capa
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => entradaProdutos.current?.click()}
            disabled={enviando}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
          >
            <ImagePlus size={15} /> Fotos de produtos
          </button>
          <button
            type="button"
            onClick={() => entradaGaleria.current?.click()}
            disabled={enviando}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
          >
            <ImagePlus size={15} /> Galeria
          </button>
          <button
            type="button"
            onClick={() => entradaEquipe.current?.click()}
            disabled={enviando}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
          >
            <ImagePlus size={15} /> Equipe
          </button>
          <button
            type="button"
            onClick={() => entradaVideo.current?.click()}
            disabled={enviando}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
          >
            <ImagePlus size={15} /> Vídeos
          </button>
        </div>
      </div>

      <ResumoMidias
        logo={logo}
        capa={capa}
        produtos={fotosProdutos}
        galeria={fotosGaleria}
        equipe={equipe}
        videos={videos}
        onRemoverLogo={() => setLogo(null)}
        onRemoverCapa={() => setCapa(null)}
        onRemoverProduto={(url) =>
          setFotosProdutos((atual) => atual.filter((foto) => foto !== url))
        }
        onRemoverGaleria={(url) => setFotosGaleria((atual) => atual.filter((foto) => foto !== url))}
        onRemoverEquipe={(id) => setEquipe((atual) => atual.filter((membro) => membro.id !== id))}
        onEditarEquipe={(id, campo, valor) =>
          setEquipe((atual) =>
            atual.map((membro) => (membro.id === id ? { ...membro, [campo]: valor } : membro)),
          )
        }
        onRemoverVideo={(id) => setVideos((atual) => atual.filter((video) => video.id !== id))}
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <span className="mb-1.5 block text-sm font-medium">Estilo visual</span>
          <div className="flex flex-wrap gap-2">
            {(["automatico", ...Object.keys(ESTILOS_IA)] as EstiloIA[]).map((op) => (
              <button
                key={op}
                type="button"
                aria-pressed={estilo === op}
                onClick={() => setEstilo(op)}
                title={
                  op === "automatico"
                    ? "A IA decide"
                    : ESTILOS_IA[op as keyof typeof ESTILOS_IA].descricao
                }
                className={`min-h-11 rounded-full border px-3 text-xs font-semibold ${
                  estilo === op
                    ? "border-ink bg-ink text-ink-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {op === "automatico"
                  ? "Automático"
                  : ESTILOS_IA[op as keyof typeof ESTILOS_IA].rotulo}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-medium">Paleta</span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["automatico", "Automática"],
                ["claro", "Clara"],
                ["escuro", "Escura"],
              ] as [TemaIA, string][]
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={tema === valor}
                onClick={() => setTema(valor)}
                className={`min-h-11 rounded-full border px-3 text-xs font-semibold ${
                  tema === valor
                    ? "border-ink bg-ink text-ink-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void revisar()}
        disabled={gerando}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-ink-foreground disabled:opacity-70 sm:w-auto"
      >
        {gerando ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
        {gerando ? "Gerando sugestão…" : plano ? "Gerar nova sugestão" : "Gerar sugestão com IA"}
      </button>
      {desabilitado && <p className="mt-2 text-xs text-muted-foreground">{desabilitado}</p>}

      {plano && (
        <RevisaoIA
          plano={plano}
          criando={criando}
          onAprovar={(aprovado) => void criarAprovado(aprovado)}
          onRegerar={() => void revisar()}
          onCancelar={() => setPlano(null)}
        />
      )}
    </div>
  );
}

function ResumoMidias({
  logo,
  capa,
  produtos,
  galeria,
  equipe,
  videos,
  onRemoverLogo,
  onRemoverCapa,
  onRemoverProduto,
  onRemoverGaleria,
  onRemoverEquipe,
  onEditarEquipe,
  onRemoverVideo,
}: {
  logo: string | null;
  capa: string | null;
  produtos: string[];
  galeria: string[];
  equipe: MembroEquipe[];
  videos: ItemVideo[];
  onRemoverLogo: () => void;
  onRemoverCapa: () => void;
  onRemoverProduto: (url: string) => void;
  onRemoverGaleria: (url: string) => void;
  onRemoverEquipe: (id: string) => void;
  onEditarEquipe: (id: string, campo: "nome" | "funcao", valor: string) => void;
  onRemoverVideo: (id: string) => void;
}) {
  if (!logo && !capa && !produtos.length && !galeria.length && !equipe.length && !videos.length)
    return null;

  const imagem = (url: string, texto: string, remover: () => void) => (
    <li key={url} className="relative">
      <img
        src={url}
        alt={texto}
        className="h-16 w-16 rounded-lg border border-border object-cover"
      />
      <button
        type="button"
        aria-label={`Remover ${texto}`}
        onClick={remover}
        className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-ink text-ink-foreground"
      >
        <Trash2 size={12} />
      </button>
    </li>
  );

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-border p-3 text-xs">
      <p className="font-semibold">Mídias que entrarão no mini-site</p>
      {(logo || capa) && (
        <div>
          <p className="mb-1 text-muted-foreground">Identidade</p>
          <ul className="flex gap-2">
            {logo && imagem(logo, "logo", onRemoverLogo)}
            {capa && imagem(capa, "capa", onRemoverCapa)}
          </ul>
        </div>
      )}
      {produtos.length > 0 && (
        <div>
          <p className="mb-1 text-muted-foreground">Fotos de produtos ({produtos.length})</p>
          <ul className="flex flex-wrap gap-2">
            {produtos.map((url) => imagem(url, "foto de produto", () => onRemoverProduto(url)))}
          </ul>
        </div>
      )}
      {galeria.length > 0 && (
        <div>
          <p className="mb-1 text-muted-foreground">Galeria ({galeria.length})</p>
          <ul className="flex flex-wrap gap-2">
            {galeria.map((url) => imagem(url, "foto da galeria", () => onRemoverGaleria(url)))}
          </ul>
        </div>
      )}
      {equipe.length > 0 && (
        <div>
          <p className="mb-1 text-muted-foreground">Equipe — informe o nome para publicar</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {equipe.map((membro) => (
              <div key={membro.id} className="flex gap-2 rounded-lg border border-border p-2">
                <img
                  src={membro.foto}
                  alt="Foto da equipe"
                  className="h-12 w-12 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <input
                    value={membro.nome}
                    onChange={(e) => onEditarEquipe(membro.id, "nome", e.target.value)}
                    placeholder="Nome"
                    className="h-8 w-full rounded border border-border bg-card px-2"
                  />
                  <input
                    value={membro.funcao}
                    onChange={(e) => onEditarEquipe(membro.id, "funcao", e.target.value)}
                    placeholder="Função"
                    className="h-8 w-full rounded border border-border bg-card px-2"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Remover pessoa"
                  onClick={() => onRemoverEquipe(membro.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {videos.length > 0 && (
        <div>
          <p className="mb-1 text-muted-foreground">Vídeos ({videos.length})</p>
          <ul className="space-y-1">
            {videos.map((video) => (
              <li
                key={video.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-secondary px-2 py-1.5"
              >
                <span className="truncate">{video.titulo}</span>
                <button
                  type="button"
                  onClick={() => onRemoverVideo(video.id)}
                  className="font-semibold"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-muted-foreground">
        Vídeos não são enviados ao Gemini; assim eles não consomem tokens.
      </p>
    </div>
  );
}
