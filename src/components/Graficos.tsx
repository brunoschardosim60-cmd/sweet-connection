import { useId } from "react";

type Ponto = { rotulo: string; valor: number };

export function GraficoArea({ dados, ariaLabel }: { dados: Ponto[]; ariaLabel: string }) {
  const gradientId = useId().replace(/:/g, "");
  const maximo = Math.max(1, ...dados.map((p) => p.valor));
  const pontos = dados.map((p, indice) => ({
    ...p,
    x: dados.length <= 1 ? 50 : (indice / (dados.length - 1)) * 100,
    y: 38 - (p.valor / maximo) * 34,
  }));
  const linha = pontos.map((p) => `${p.x},${p.y}`).join(" ");
  const area = pontos.length ? `M ${linha.replaceAll(" ", " L ")} L 100,40 L 0,40 Z` : "";

  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
      className="h-full w-full overflow-visible"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <path d={area} fill={`url(#${gradientId})`} />}
      {linha && (
        <polyline
          points={linha}
          fill="none"
          stroke="var(--color-chart-1)"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {pontos.map((p) => (
        <circle key={`${p.rotulo}-${p.x}`} cx={p.x} cy={p.y} r="1.5" fill="transparent">
          <title>{`${p.rotulo}: ${p.valor}`}</title>
        </circle>
      ))}
    </svg>
  );
}

export function GraficoBarras({ dados, ariaLabel }: { dados: Ponto[]; ariaLabel: string }) {
  const maximo = Math.max(1, ...dados.map((p) => p.valor));
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="grid h-full items-end gap-2"
      style={{ gridTemplateColumns: `repeat(${Math.max(dados.length, 1)}, minmax(0, 1fr))` }}
    >
      {dados.map((p) => (
        <div key={p.rotulo} className="flex h-full min-w-0 flex-col justify-end text-center">
          <div className="flex min-h-0 flex-1 items-end justify-center">
            <span
              className="block w-full max-w-10 rounded-t-md bg-[var(--color-chart-2)]"
              style={{ height: `${Math.max(3, (p.valor / maximo) * 100)}%` }}
              title={`${p.rotulo}: ${p.valor}`}
            />
          </div>
          <span className="mt-1 truncate text-[11px] text-muted-foreground">{p.rotulo}</span>
        </div>
      ))}
    </div>
  );
}
