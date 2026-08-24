import { useEffect, useRef, useState, type ReactNode } from "react";
import { escalaPrevia, type Caixa } from "@/lib/nexa/previa";

/**
 * Renderiza o conteúdo no tamanho real do dispositivo e apenas reduz
 * visualmente para caber no espaço disponível. Assim o layout interno é
 * idêntico ao de um celular/tablet real, inclusive a moldura do aparelho.
 */
export function PalcoEscalado({
  dispositivo,
  children,
  zoom = 1,
  escalaMinima = 0,
  alinharNoTopo = false,
  className = "",
  onEscala,
}: {
  dispositivo: Caixa;
  children: ReactNode;
  /** Multiplicador manual aplicado sobre a escala que cabe na tela. */
  zoom?: number;
  /** Evita uma prévia pequena demais; o palco passa a rolar quando necessário. */
  escalaMinima?: number;
  /** Mantém o topo acessível quando a prévia é maior do que o palco. */
  alinharNoTopo?: boolean;
  className?: string;
  onEscala?: (escala: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ajuste, setAjuste] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => {
      const r = el.getBoundingClientRect();
      setAjuste(escalaPrevia({ largura: r.width, altura: r.height }, dispositivo));
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, [dispositivo]);

  const escala = Math.max(ajuste, escalaMinima) * zoom;

  useEffect(() => {
    onEscala?.(escala);
  }, [escala, onEscala]);

  return (
    <div
      ref={ref}
      className={`scrollbar-invisivel flex min-h-0 w-full flex-1 justify-center overflow-auto ${
        alinharNoTopo ? "items-start" : "items-center"
      } ${className}`}
    >
      <div
        style={{
          width: dispositivo.largura * escala,
          height: dispositivo.altura * escala,
        }}
        className="relative shrink-0"
      >
        <div
          style={{
            width: dispositivo.largura,
            height: dispositivo.altura,
            transform: `scale(${escala})`,
            transformOrigin: "top left",
          }}
          className="absolute left-0 top-0"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
