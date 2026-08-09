import { createFileRoute, Link } from "@tanstack/react-router";
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
