import type { ReactNode } from "react";

/** Moldura de celular usada nas demonstrações e no editor. */
export function PhoneFrame({
  children,
  className = "",
  largura = 300,
  altura = 620,
}: {
  children: ReactNode;
  className?: string;
  largura?: number;
  altura?: number;
}) {
  return (
    <div
      className={`relative shrink-0 rounded-[2.6rem] border border-ink/15 bg-ink p-2.5 shadow-[var(--shadow-phone)] ${className}`}
      style={{ width: largura, height: altura }}
    >
      <div className="absolute left-1/2 top-3.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-ink" />
      <div className="h-full w-full overflow-hidden rounded-[2.1rem] bg-background">
        <div className="h-full w-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
