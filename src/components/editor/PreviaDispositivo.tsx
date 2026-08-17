import type { ReactNode } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { dimensoesDispositivo, larguraCssPrevia } from "@/lib/nexa/previa";

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
  return (
    <div
      style={{ containerType: "size" }}
      className="flex min-h-0 w-full flex-1 items-center justify-center"
    >
      <Moldura dispositivo={dispositivo}>{children}</Moldura>
    </div>
  );
}

function Moldura({ dispositivo, children }: { dispositivo: Dispositivo; children: ReactNode }) {
  if (dispositivo === "celular") {
    const disp = dimensoesDispositivo.celular;
    return (
      <PhoneFrame
        largura={larguraCssPrevia(disp)}
        proporcao={disp.largura / disp.altura}
        className="max-h-full max-w-full"
      >
        {children}
      </PhoneFrame>
    );
  }

  if (dispositivo === "tablet") {
    const disp = dimensoesDispositivo.tablet;
    return (
      <div
        style={{
          width: larguraCssPrevia(disp),
          aspectRatio: `${disp.largura} / ${disp.altura}`,
        }}
        className="max-h-full max-w-full overflow-y-auto overflow-x-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]"
      >
        {children}
      </div>
    );
  }

  return (
    <div className="h-full max-h-[660px] w-full max-w-4xl overflow-y-auto overflow-x-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
      {children}
    </div>
  );
}
