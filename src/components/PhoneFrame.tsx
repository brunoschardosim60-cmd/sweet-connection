import type { CSSProperties, ReactNode } from "react";

export type ModeloCelular = "iphone-dynamic" | "iphone-notch" | "android-punch" | "minimalista";

/** Moldura de celular usada nas demonstrações e no editor. */
export function PhoneFrame({
  children,
  className = "",
  largura = 300,
  altura = 620,
  proporcao,
  areaSegura,
  modelo = "iphone-dynamic",
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
  /** Modelo de dispositivo móvel. */
  modelo?: ModeloCelular;
}) {
  const style: CSSProperties = proporcao
    ? { width: largura, aspectRatio: String(proporcao) }
    : { width: largura, height: altura };

  return (
    <div
      className={`relative shrink-0 select-none bg-[#121413] shadow-[var(--shadow-phone)] ${
        modelo === "iphone-dynamic"
          ? "rounded-[2.6rem] p-[9px] ring-1 ring-white/15"
          : modelo === "iphone-notch"
            ? "rounded-[2.4rem] p-[10px] ring-1 ring-white/15"
            : modelo === "android-punch"
              ? "rounded-[2.2rem] p-[8px] ring-1 ring-white/15"
              : "rounded-[2rem] p-[6px] ring-1 ring-white/15"
      } ${className}`}
      style={style}
    >
      {/* Botões físicos laterais discretos para os modelos iPhone/Android */}
      {modelo !== "minimalista" && (
        <>
          {/* Botão de volume / ação (lado esquerdo) */}
          <div className="absolute -left-[3px] top-20 h-8 w-[3px] rounded-l-sm bg-white/20" />
          <div className="absolute -left-[3px] top-32 h-10 w-[3px] rounded-l-sm bg-white/20" />
          <div className="absolute -left-[3px] top-44 h-10 w-[3px] rounded-l-sm bg-white/20" />
          {/* Botão de energia (lado direito) */}
          <div className="absolute -right-[3px] top-28 h-12 w-[3px] rounded-r-sm bg-white/20" />
        </>
      )}

      {/* Detalhes do Notch / Câmera superior */}
      {modelo === "iphone-dynamic" && (
        <>
          {/* Dynamic Island */}
          <div className="pointer-events-none absolute left-1/2 top-3 z-20 flex h-4 w-20 -translate-x-1/2 items-center justify-end rounded-full bg-black px-2 ring-1 ring-white/10 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#0a0d14] ring-1 ring-white/20" />
          </div>
          {/* Barra inferior iOS */}
          <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-20 h-1 w-24 -translate-x-1/2 rounded-full bg-white/30" />
        </>
      )}

      {modelo === "iphone-notch" && (
        <>
          {/* Notch clássico */}
          <div className="pointer-events-none absolute left-1/2 top-0 z-20 flex h-5 w-28 -translate-x-1/2 items-center justify-center rounded-b-xl bg-black">
            <span className="mr-2 h-1 w-10 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-[#0a0d14] ring-1 ring-white/20" />
          </div>
          {/* Barra inferior iOS */}
          <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-20 h-1 w-24 -translate-x-1/2 rounded-full bg-white/30" />
        </>
      )}

      {modelo === "android-punch" && (
        <>
          {/* Alto-falante superior */}
          <div className="pointer-events-none absolute left-1/2 top-1 z-20 h-[2px] w-10 -translate-x-1/2 rounded-full bg-white/20" />
          {/* Câmera em furo (hole-punch) */}
          <div className="pointer-events-none absolute left-1/2 top-3.5 z-20 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-black ring-2 ring-[#242624]" />
          {/* Indicador inferior Android */}
          <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-20 h-0.5 w-16 -translate-x-1/2 rounded-full bg-white/30" />
        </>
      )}

      {/* 
        Tela interna: Fundo OLED preto absoluto (#000000) e overflow-hidden rigoroso.
        Isso elimina completamente os pequenos pontos/vazamentos brancos nas bordas arredondadas.
      */}
      <div
        className={`h-full w-full overflow-hidden bg-black ${
          modelo === "iphone-dynamic"
            ? "rounded-[2.15rem]"
            : modelo === "iphone-notch"
              ? "rounded-[1.9rem]"
              : modelo === "android-punch"
                ? "rounded-[1.75rem]"
                : "rounded-[1.6rem]"
        }`}
      >
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
