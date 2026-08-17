import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Maximize2,
  Minimize2,
  Monitor,
  RotateCcw,
  Smartphone,
  Tablet,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { PalcoEscalado } from "@/components/editor/PalcoEscalado";
import { deitar, dimensoesDispositivo, paddingAreaSegura } from "@/lib/nexa/previa";

export type Dispositivo = "celular" | "tablet" | "desktop";
export type Orientacao = "vertical" | "horizontal";

export const dispositivos: { id: Dispositivo; rotulo: string; icone: typeof Monitor }[] = [
  { id: "celular", rotulo: "Celular", icone: Smartphone },
  { id: "tablet", rotulo: "Tablet", icone: Tablet },
  { id: "desktop", rotulo: "Desktop", icone: Monitor },
];

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;

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
            className={`grid h-8 w-8 place-items-center rounded-full transition-colors ${
              ativo ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Icone size={14} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

function BotaoControle({
  rotulo,
  onClick,
  ativo = false,
  desabilitado = false,
  children,
}: {
  rotulo: string;
  onClick: () => void;
  ativo?: boolean;
  desabilitado?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={rotulo}
      aria-label={rotulo}
      aria-pressed={ativo}
      disabled={desabilitado}
      onClick={onClick}
      className={`grid h-7 w-7 place-items-center rounded-full transition-colors disabled:opacity-30 ${
        ativo
          ? "bg-ink text-ink-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Moldura da prévia com controles de orientação, zoom, modelo de celular e tela cheia.
 * O conteúdo é renderizado no tamanho real do dispositivo e apenas escalado.
 */
export function MolduraPrevia({
  dispositivo,
  children,
  controles = true,
}: {
  dispositivo: Dispositivo;
  children: ReactNode;
  controles?: boolean;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [orientacao, setOrientacao] = useState<Orientacao>("vertical");
  const [zoom, setZoom] = useState(1);
  const [telaCheia, setTelaCheia] = useState(false);

  useEffect(() => {
    const aoMudar = () => setTelaCheia(document.fullscreenElement === areaRef.current);
    document.addEventListener("fullscreenchange", aoMudar);
    return () => document.removeEventListener("fullscreenchange", aoMudar);
  }, []);

  const alternarTelaCheia = useCallback(() => {
    const el = areaRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }, []);

  const horizontal = orientacao === "horizontal";
  const desktop = dispositivo === "desktop";
  const base = desktop ? null : dimensoesDispositivo[dispositivo];
  const caixa = base ? (horizontal ? deitar(base) : base) : null;
  const seguro = base ? paddingAreaSegura(dispositivo as "celular" | "tablet", horizontal) : null;

  return (
    <div
      ref={areaRef}
      className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden bg-secondary/40 data-[cheia=true]:bg-background data-[cheia=true]:p-4"
      data-cheia={telaCheia}
    >
      {controles && (
        <div
          role="group"
          aria-label="Controles da prévia"
          className="absolute bottom-3 right-3 z-20 flex shrink-0 items-center gap-0.5 rounded-full border border-border/80 bg-background/90 p-0.5 shadow-md backdrop-blur-md"
        >
          <BotaoControle
            rotulo={horizontal ? "Orientação vertical" : "Orientação horizontal"}
            ativo={horizontal}
            desabilitado={desktop}
            onClick={() => setOrientacao(horizontal ? "vertical" : "horizontal")}
          >
            <RotateCcw size={13} aria-hidden />
          </BotaoControle>
          <BotaoControle
            rotulo="Diminuir zoom"
            desabilitado={zoom <= ZOOM_MIN}
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - 0.1) * 10) / 10))}
          >
            <ZoomOut size={13} aria-hidden />
          </BotaoControle>
          <span
            aria-live="polite"
            className="min-w-9 text-center text-[10px] font-semibold tabular-nums text-muted-foreground select-none"
          >
            {Math.round(zoom * 100)}%
          </span>
          <BotaoControle
            rotulo="Aumentar zoom"
            desabilitado={zoom >= ZOOM_MAX}
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + 0.1) * 10) / 10))}
          >
            <ZoomIn size={13} aria-hidden />
          </BotaoControle>
          <BotaoControle rotulo="Zoom padrão" onClick={() => setZoom(1)}>
            <span className="text-[10px] font-semibold">1x</span>
          </BotaoControle>
          <BotaoControle
            rotulo={telaCheia ? "Sair da tela cheia" : "Ver em tela cheia"}
            ativo={telaCheia}
            onClick={alternarTelaCheia}
          >
            {telaCheia ? <Minimize2 size={13} aria-hidden /> : <Maximize2 size={13} aria-hidden />}
          </BotaoControle>
        </div>
      )}

      {caixa && seguro ? (
        <PalcoEscalado dispositivo={caixa} zoom={zoom}>
          {dispositivo === "celular" ? (
            <PhoneFrame largura={caixa.largura} altura={caixa.altura} areaSegura={seguro}>
              {children}
            </PhoneFrame>
          ) : (
            <div
              style={seguro}
              className="h-full w-full overflow-y-auto overflow-x-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]"
            >
              {children}
            </div>
          )}
        </PalcoEscalado>
      ) : (
        <div className="flex min-h-0 w-full flex-1 items-center justify-center">
          <div className="h-full max-h-[660px] w-full max-w-4xl overflow-y-auto overflow-x-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
