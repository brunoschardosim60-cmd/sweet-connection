import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { biblioteca } from "@/lib/nexa/images";

export const Route = createFileRoute("/painel/midias")({
  component: Midias,
});

function Midias() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold">Mídias</h1>
          <p className="text-sm text-muted-foreground">Biblioteca de imagens de demonstração.</p>
        </div>
        <button
          type="button"
          onClick={() => toast("Recurso disponível em breve", { description: "Upload de arquivos próprios." })}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-ink-foreground"
        >
          <Upload size={15} /> Enviar imagem
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {biblioteca.map((b) => (
          <figure key={b.id} className="surface overflow-hidden">
            <img src={b.url} alt={b.nome} loading="lazy" className="h-32 w-full object-cover" />
            <figcaption className="p-3 text-xs font-medium">{b.nome}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
