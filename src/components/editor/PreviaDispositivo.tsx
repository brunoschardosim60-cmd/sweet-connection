import type { ReactNode } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { PalcoEscalado } from "@/components/editor/PalcoEscalado";
import { dimensoesDispositivo } from "@/lib/nexa/previa";


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
            className={`grid h-11 w-11 place-items-center rounded-full ${
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
  if (dispositivo === "celular") {
    const disp = dimensoesDispositivo.celular;
    return (
      <PalcoEscalado dispositivo={disp}>
        <PhoneFrame largura={disp.largura} altura={disp.altura} className="h-full w-full">
          {children}
        </PhoneFrame>
      </PalcoEscalado>
    );
  }

  if (dispositivo === "tablet") {
    const disp = dimensoesDispositivo.tablet;
    return (
      <PalcoEscalado dispositivo={disp}>
        <div className="h-full w-full overflow-y-auto overflow-x-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
          {children}
        </div>
      </PalcoEscalado>
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-1 items-center justify-center">
      <div className="h-full max-h-[660px] w-full max-w-4xl overflow-y-auto overflow-x-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        {children}
      </div>
    </div>
  );
}

