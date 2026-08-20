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
import type { Cliente, Site } from "@/lib/nexa/types";

/**
 * Criação automática: a pessoa descreve o negócio, envia fotos e a IA
 * monta seções, itens, textos e paleta do mini-site.
 */
export function CriacaoIA({
  cliente,
  slug,
  desabilitado,
  onCriar,
}: {
  cliente: Cliente;
  slug: string;
  desabilitado?: string;
  onCriar: (site: Site) => Promise<void>;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const gerar = useServerFn(gerarPlanoSite);
  const [descricao, setDescricao] = useState("");
  const [imagens, setImagens] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [estilo, setEstilo] = useState<EstiloIA>("automatico");
  const [tema, setTema] = useState<TemaIA>("automatico");
  const [plano, setPlano] = useState<PlanoIA | null>(null);

  const enviar = async (arquivos: FileList | null) => {
    if (!arquivos?.length) return;
    setEnviando(true);
    try {
      const novas: string[] = [];
      for (const arquivo of Array.from(arquivos).slice(0, 6)) {
        const midia = await enviarArquivo(arquivo);
        novas.push(midia.url);
      }
      setImagens((atual) => [...atual, ...novas].slice(0, 6));
    } catch (e) {
      toast.error("Falha no envio da imagem", { description: (e as Error).message });
    } finally {
      setEnviando(false);
      if (entrada.current) entrada.current.value = "";
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
        imagens,
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
      const sugestao = await gerar({ data: entrada });
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
      await onCriar(aplicarPlanoIA(base, aprovado, imagens, { estilo, tema }));
    } catch (e) {
      toast.error("Não foi possível criar o mini-site", { description: (e as Error).message });
    } finally {
      setCriando(false);
    }
  };

  return (
    <div className="surface border-ink/20 p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-ink-foreground">
          <Sparkles size={16} />
        </span>
        <div>
          <h2 className="font-display text-base font-bold">Criação automática com IA</h2>
          <p className="text-xs text-muted-foreground">
            Descreva o negócio e envie fotos: a IA cria do zero a estrutura, as cores e o conteúdo.
          </p>
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">O que o negócio faz</span>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={3}
          placeholder="Ex.: barbearia masculina com corte, barba e produtos próprios, atendimento com hora marcada."
          className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-ink"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={entrada}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => void enviar(e.target.files)}
        />
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          disabled={enviando}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
        >
          {enviando ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
          Enviar fotos
        </button>
        <span className="text-xs text-muted-foreground">
          {imagens.length ? `${imagens.length} foto(s) — a 1ª vira capa` : "Opcional (até 6)"}
        </span>
      </div>

      {imagens.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {imagens.map((url) => (
            <li key={url} className="relative">
              <img src={url} alt="" className="h-16 w-16 rounded-lg object-cover" />
              <button
                type="button"
                aria-label="Remover foto"
                onClick={() => setImagens((a) => a.filter((u) => u !== url))}
                className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-ink text-ink-foreground"
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

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
