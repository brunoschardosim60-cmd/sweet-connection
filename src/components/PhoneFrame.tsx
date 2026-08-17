import type { CSSProperties, ReactNode } from "react";

/** Moldura de celular usada nas demonstrações e no editor. */
export function PhoneFrame({
  children,
  className = "",
  largura = 300,
  altura = 620,
  proporcao,
  areaSegura,
}: {
  children: ReactNode;
  className?: string;
  /** Largura em px ou qualquer valor CSS (ex.: `min(100%, 216px)`). */
  largura?: number | string;
  /** Altura em px ou valor CSS. Ignorada quando `proporcao` é informada. */
  altura?: number | string;
  /** Proporção largura/altura; quando definida, a altura acompanha a largura. */
  proporcao?: number;
  /** Recuos de área segura (notch/barra inferior) aplicados ao conteúdo. */
  areaSegura?: Pick<CSSProperties, "paddingTop" | "paddingBottom" | "paddingLeft" | "paddingRight">;
}) {
  const style: CSSProperties = proporcao
    ? { width: largura, aspectRatio: String(proporcao) }
    : { width: largura, height: altura };

  return (
    <div
      className={`relative shrink-0 rounded-[2.6rem] border border-ink/15 bg-ink p-2.5 shadow-[var(--shadow-phone)] ${className}`}
      style={style}
    >
      <div className="absolute left-1/2 top-3.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-ink" />
      <div className="h-full w-full overflow-hidden rounded-[2.1rem] bg-background">
        <div
          style={areaSegura}
          className="h-full w-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
