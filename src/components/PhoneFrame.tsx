import type { CSSProperties, ReactNode } from "react";

/**
 * Moldura de celular padrão usada nas demonstrações e no editor.
 * Modelo único (iPhone com Dynamic Island), sem bordas claras e sem faixas pretas:
 * o conteúdo ocupa a tela inteira e a área segura é apenas um recuo interno do conteúdo.
 */
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
  /** Largura em px ou qualquer valor CSS. */
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
      className={`relative shrink-0 select-none overflow-hidden rounded-[3.2rem] bg-background shadow-[var(--shadow-phone)] ${className}`}
      style={style}
    >
      {/* Botões físicos laterais discretos */}
      <div className="absolute -left-[3px] top-24 h-9 w-[3px] rounded-l-sm bg-[#2a2c2b]" />
      <div className="absolute -left-[3px] top-36 h-11 w-[3px] rounded-l-sm bg-[#2a2c2b]" />
      <div className="absolute -right-[3px] top-32 h-12 w-[3px] rounded-r-sm bg-[#2a2c2b]" />

      {/* Dynamic Island */}
      <div className="pointer-events-none absolute left-1/2 top-[10px] z-20 flex h-4 w-20 -translate-x-1/2 items-center justify-end rounded-full bg-black/85 px-2">
        <span className="h-2 w-2 rounded-full bg-[#0a0d14]" />
      </div>
      {/* Barra inferior iOS */}
      <div className="pointer-events-none absolute bottom-[10px] left-1/2 z-20 h-1 w-24 -translate-x-1/2 rounded-full bg-black/25 mix-blend-luminosity" />

      {/* Tela: o conteúdo preenche 100% da moldura, sem bordas pretas */}
      <div className="h-full w-full overflow-hidden rounded-[3.2rem]">
        <div
          style={areaSegura}
          className="h-full w-full overflow-y-auto overflow-x-hidden [&>*]:min-h-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {children}
        </div>
      </div>
    </div>
  );

}
