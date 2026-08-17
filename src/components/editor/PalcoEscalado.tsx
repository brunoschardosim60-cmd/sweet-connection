import { useEffect, useRef, useState, type ReactNode } from "react";
import { escalaPrevia, type Caixa } from "@/lib/nexa/previa";

/**
 * Renderiza o conteúdo no tamanho real do dispositivo e apenas reduz
 * visualmente (transform: scale) para caber no espaço disponível.
 * Assim o layout interno é idêntico ao de um celular/tablet real.
 */
export function PalcoEscalado({
  dispositivo,
  children,
  className = "",
}: {
  dispositivo: Caixa;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => {
      const r = el.getBoundingClientRect();
      setEscala(escalaPrevia({ largura: r.width, altura: r.height }, dispositivo));
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, [dispositivo]);

  return (
    <div ref={ref} className={`flex min-h-0 w-full flex-1 items-center justify-center ${className}`}>
      <div
        style={{
          width: dispositivo.largura,
          height: dispositivo.altura,
          transform: `scale(${escala})`,
          transformOrigin: "center center",
        }}
        className="shrink-0"
      >
        {children}
      </div>
    </div>
  );
}
