import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Sparkles, Wand2 } from "lucide-react";
import { modelos } from "@/lib/nexa/modelos";
import { nomeSegmento } from "@/lib/nexa/segmentos";

export const Route = createFileRoute("/painel/modelos")({
  component: PainelModelos,
});

function PainelModelos() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Modelos</h1>
        <p className="text-sm text-muted-foreground">
          Base visual usada na criação de novos mini-sites.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="surface overflow-hidden border-ink/30">
          <div className="relative grid h-36 place-items-center overflow-hidden bg-ink text-ink-foreground">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(184,255,60,.26),transparent_48%)]" />
            <span className="relative grid h-12 w-12 place-items-center rounded-full bg-lime text-ink">
              <Wand2 size={22} />
            </span>
          </div>
          <div className="p-4">
            <p className="flex items-center gap-2 font-semibold">
              <Sparkles size={15} className="text-lime-700" /> Criação automática com IA
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Descreva o negócio e envie fotos para receber uma sugestão completa e editável.
            </p>
            <Link
              to="/painel/novo"
              search={{ modo: "ia" }}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-3 text-center text-xs font-semibold text-ink-foreground"
            >
              <Check size={14} /> Criar com IA
            </Link>
          </div>
        </div>
        {modelos.map((m) => (
          <div key={m.id} className="surface overflow-hidden">
            <img src={m.imagem} alt={m.nome} loading="lazy" className="h-36 w-full object-cover" />
            <div className="p-4">
              <p className="font-semibold">{m.nome}</p>
              <p className="text-xs text-muted-foreground">{nomeSegmento(m.segmento)}</p>
              <div className="mt-4 flex gap-2">
                <Link
                  to="/demonstracao/$modelo"
                  params={{ modelo: m.id }}
                  className="flex-1 rounded-full border border-border px-3 py-2 text-center text-xs font-semibold"
                >
                  Visualizar
                </Link>
                <Link
                  to="/painel/novo"
                  search={{ modelo: m.id }}
                  className="flex-1 rounded-full bg-ink px-3 py-2 text-center text-xs font-semibold text-ink-foreground"
                >
                  Usar modelo
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
