import { useEffect, useRef, useState, type ReactNode } from "react";
import { escalaPrevia, previaLegivel, type Caixa } from "@/lib/nexa/previa";

/**
 * Mantém a largura lógica do dispositivo. Pode encurtar a janela de conteúdo
 * antes de reduzir a escala, preservando a leitura em palcos de pouca altura.
 */
export function PalcoEscalado({
  dispositivo,
  children,
  zoom = 1,
  escalaMinima = 0,
  adaptarAltura = false,
  alinharNoTopo = false,
  className = "",
  onEscala,
}: {
  dispositivo: Caixa;
  children: ReactNode | ((caixa: Caixa) => ReactNode);
  adaptarAltura?: boolean;
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
  const [disponivel, setDisponivel] = useState<Caixa>({ largura: 0, altura: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => {
      const r = el.getBoundingClientRect();
      setDisponivel({ largura: r.width, altura: r.height });
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const legivel = previaLegivel(disponivel, dispositivo);
  const caixa = adaptarAltura ? legivel.caixa : dispositivo;
  const ajuste = adaptarAltura ? legivel.escala : escalaPrevia(disponivel, dispositivo);
  const escala = (adaptarAltura ? ajuste : Math.max(ajuste, escalaMinima)) * zoom;

  useEffect(() => {
    onEscala?.(escala);
  }, [escala, onEscala]);

  return (
    <div
      ref={ref}
      data-previa-palco
      className={`scrollbar-invisivel flex min-h-0 w-full flex-1 overflow-auto ${className}`}
    >
      <div
        style={{
          width: caixa.largura * escala,
          height: caixa.altura * escala,
        }}
        data-previa-moldura
        className={`relative mx-auto shrink-0 ${alinharNoTopo ? "mb-auto" : "my-auto"}`}
      >
        <div
          style={{
            width: caixa.largura,
            height: caixa.altura,
            transform: `scale(${escala})`,
            transformOrigin: "top left",
          }}
          className="absolute left-0 top-0"
        >
          {typeof children === "function" ? children(caixa) : children}
        </div>
      </div>
    </div>
  );
}
