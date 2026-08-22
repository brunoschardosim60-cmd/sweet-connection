import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ImagePlus, Link2, Trash2, Upload, Video } from "lucide-react";
import { toast } from "sonner";
import { biblioteca } from "@/lib/nexa/images";
import { enviarArquivo, midiaStore, urlEmbed, type TipoMidia } from "@/lib/nexa/media";

export function useMidias() {
  const midias = useSyncExternalStore(midiaStore.subscribe, midiaStore.get, midiaStore.getServer);
  useEffect(() => {
    void midiaStore.carregar().catch(() => undefined);
  }, []);
  return midias;
}

export function PreviaMidia({
  url,
  tipo = "imagem",
  className = "",
}: {
  url?: string;
  tipo?: TipoMidia;
  className?: string;
}) {
  if (!url) return null;
  if (tipo === "video") {
    const embed = urlEmbed(url);
    if (embed?.tipo === "iframe")
      return <iframe src={embed.src} title="Vídeo" allowFullScreen className={className} />;
    return <video src={url} controls playsInline className={className} />;
  }
  return <img src={url} alt="" loading="lazy" className={className} />;
}

/**
 * Seletor unificado de mídia: upload do computador, biblioteca local e URL externa.
 * Usado no editor para capa, logo, produtos, galeria e vídeos.
 */
export function SeletorMidia({
  rotulo,
  valor,
  onChange,
  tipo = "imagem",
  permitirRemover = true,
}: {
  rotulo: string;
  valor?: string;
  onChange: (url: string) => void;
  tipo?: TipoMidia;
  permitirRemover?: boolean;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const midias = useMidias();
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const doTipo = midias.filter((m) => m.tipo === tipo);

  const enviar = async (arquivo?: File | null) => {
    if (!arquivo) return;
    setEnviando(true);
    try {
      const midia = await enviarArquivo(arquivo);
      onChange(midia.url);
      toast.success("Mídia enviada", { description: midia.nome });
    } catch (e) {
      toast.error("Falha no envio", { description: (e as Error).message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{rotulo}</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
          >
            <Upload size={12} /> {enviando ? "Enviando…" : "Enviar"}
          </button>
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
          >
            {tipo === "video" ? <Video size={12} /> : <ImagePlus size={12} />} Biblioteca
          </button>
        </div>
      </div>

      <input
        ref={entrada}
        type="file"
        accept={tipo === "video" ? "video/*" : "image/*"}
        className="hidden"
        onChange={(e) => {
          void enviar(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <p className="text-xs text-muted-foreground">
        Envie apenas conteúdo que possa ser exibido publicamente. Não envie documentos ou dados
        pessoais sensíveis.
      </p>

      {valor ? (
        <div className="relative overflow-hidden rounded-xl border border-border bg-card">
          <PreviaMidia url={valor} tipo={tipo} className="h-28 w-full object-cover" />
          {permitirRemover && (
            <button
              type="button"
              aria-label="Remover mídia"
              onClick={() => onChange("")}
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-background/90 text-ember"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ) : (
        <div className="grid h-16 place-items-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
          Nenhuma mídia selecionada
        </div>
      )}

      {aberto && (
        <div className="space-y-2 rounded-xl border border-border bg-background p-2.5">
          {tipo === "imagem" && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Imagens do sistema
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {biblioteca.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    aria-label={b.nome}
                    onClick={() => onChange(b.url)}
                    className={`overflow-hidden rounded-lg border ${valor === b.url ? "border-ink ring-2 ring-lime" : "border-border"}`}
                  >
                    <img
                      src={b.url}
                      alt={b.nome}
                      loading="lazy"
                      className="h-10 w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </>
          )}

          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Meus envios
          </p>
          {doTipo.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nada enviado ainda.</p>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {doTipo.map((m) => (
                <div key={m.id} className="relative">
                  <button
                    type="button"
                    aria-label={m.nome}
                    onClick={() => onChange(m.url)}
                    className={`block w-full overflow-hidden rounded-lg border ${valor === m.url ? "border-ink ring-2 ring-lime" : "border-border"}`}
                  >
                    <PreviaMidia url={m.url} tipo={m.tipo} className="h-10 w-full object-cover" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Excluir ${m.nome}`}
                    onClick={() =>
                      void midiaStore.remover(m.id).catch((error: unknown) =>
                        toast.error("Não foi possível excluir", {
                          description: error instanceof Error ? error.message : undefined,
                        }),
                      )
                    }
                    className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-background text-ember shadow"
                  >
                    <Trash2 size={9} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5">
            <Link2 size={13} className="shrink-0 text-muted-foreground" />
            <input
              value={valor ?? ""}
              placeholder={
                tipo === "video" ? "Link do YouTube, Vimeo ou .mp4" : "Cole a URL da imagem"
              }
              onChange={(e) => onChange(e.target.value)}
              className="h-9 w-full bg-transparent text-xs outline-none"
            />
          </label>
        </div>
      )}
    </div>
  );
}
