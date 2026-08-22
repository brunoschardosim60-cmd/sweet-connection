import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { BotaoRemover } from "@/components/editor/BotaoRemover";
import { PreviaMidia, useMidias } from "@/components/editor/SeletorMidia";
import { biblioteca } from "@/lib/nexa/images";
import { enviarArquivo, midiaStore } from "@/lib/nexa/media";

export const Route = createFileRoute("/painel/midias")({
  component: Midias,
});

function Midias() {
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const midias = useMidias();

  const enviar = async (arquivo?: File) => {
    if (!arquivo || enviando) return;
    setEnviando(true);
    try {
      const midia = await enviarArquivo(arquivo);
      toast.success("Mídia enviada", { description: midia.nome });
    } catch (error) {
      toast.error("Falha no envio", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold">Mídias</h1>
          <p className="text-sm text-muted-foreground">
            Arquivos próprios armazenados no Supabase e imagens incluídas no sistema.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            As mídias podem ser usadas em páginas públicas. Não envie documentos ou dados sensíveis.
          </p>
        </div>
        <button
          type="button"
          disabled={enviando}
          onClick={() => entrada.current?.click()}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-ink-foreground disabled:opacity-60"
        >
          <Upload size={15} /> {enviando ? "Enviando…" : "Enviar mídia"}
        </button>
        <input
          ref={entrada}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
          className="hidden"
          onChange={(event) => {
            void enviar(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Meus envios</h2>
        {midias.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            Nenhum arquivo enviado ainda.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {midias.map((midia) => (
              <figure key={midia.id} className="surface overflow-hidden">
                <PreviaMidia
                  url={midia.url}
                  tipo={midia.tipo}
                  className="h-32 w-full object-cover"
                />
                <figcaption className="space-y-2 p-3 text-xs font-medium">
                  <p className="truncate">{midia.nome}</p>
                  <BotaoRemover
                    descricao={`Excluir ${midia.nome}?`}
                    onConfirmar={() =>
                      void midiaStore
                        .remover(midia.id)
                        .then(() => toast.success("Mídia excluída"))
                        .catch((error: unknown) =>
                          toast.error("Não foi possível excluir", {
                            description: error instanceof Error ? error.message : undefined,
                          }),
                        )
                    }
                  />
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-semibold">Imagens do sistema</h2>
          <p className="text-xs text-muted-foreground">
            Conteúdo demonstrativo incluído no projeto; não são uploads da sua conta.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {biblioteca.map((item) => (
            <figure key={item.id} className="surface overflow-hidden">
              <img
                src={item.url}
                alt={item.nome}
                loading="lazy"
                className="h-32 w-full object-cover"
              />
              <figcaption className="p-3 text-xs font-medium">{item.nome}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}
