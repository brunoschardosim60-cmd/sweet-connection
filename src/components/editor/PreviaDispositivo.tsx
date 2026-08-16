import type { ReactNode } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { PhoneFrame } from "@/components/PhoneFrame";

export type Dispositivo = "celular" | "tablet" | "desktop";

export const dispositivos: { id: Dispositivo; rotulo: string; icone: typeof Monitor }[] = [
  { id: "celular", rotulo: "Celular", icone: Smartphone },
  { id: "tablet", rotulo: "Tablet", icone: Tablet },
  { id: "desktop", rotulo: "Desktop", icone: Monitor },
];

/** Alternador de prévia por dispositivo. */
export function SeletorDispositivo({
  valor,
  onChange,
  className = "",
}: {
  valor: Dispositivo;
  onChange: (d: Dispositivo) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Tamanho da prévia"
      className={`flex shrink-0 rounded-full border border-border bg-background p-0.5 ${className}`}
    >
      {dispositivos.map((d) => {
        const Icone = d.icone;
        const ativo = valor === d.id;
        return (
          <button
            key={d.id}
            type="button"
            title={`Prévia ${d.rotulo.toLowerCase()}`}
            aria-label={`Prévia ${d.rotulo.toLowerCase()}`}
            aria-pressed={ativo}
            onClick={() => onChange(d.id)}
            className={`grid h-9 w-9 place-items-center rounded-full ${
              ativo ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Icone size={15} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

/** Moldura da prévia conforme o dispositivo escolhido, sem estourar a largura. */
export function MolduraPrevia({
  dispositivo,
  children,
}: {
  dispositivo: Dispositivo;
  children: ReactNode;
}) {
  if (dispositivo === "celular")
    return (
      <PhoneFrame altura={660} className="max-w-full">
        {children}
      </PhoneFrame>
    );

  const largura = dispositivo === "tablet" ? "w-[720px]" : "w-full max-w-4xl";

  return (
    <div
      className={`h-[660px] max-w-full overflow-y-auto overflow-x-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] ${largura}`}
    >
      {children}
    </div>
  );
}
