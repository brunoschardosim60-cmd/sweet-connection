import type { CSSProperties } from "react";
import type { Site } from "@/lib/nexa/types";

export const fontes: Record<Site["aparencia"]["fonte"], string> = {
  moderna: '"Plus Jakarta Sans", system-ui, sans-serif',
  elegante: 'Georgia, "Times New Roman", serif',
  tecnica: 'ui-monospace, "SFMono-Regular", "Menlo", monospace',
  editorial: '"Bricolage Grotesque", Georgia, serif',
};

export const espacos: Record<Site["aparencia"]["espacamento"], string> = {
  compacto: "1.25rem",
  confortavel: "2rem",
  amplo: "3rem",
};

export function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full.slice(0, 6) || "000000", 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function contraste(hex: string) {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full.slice(0, 6) || "000000", 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#101010" : "#ffffff";
}

/** Variáveis de tema do mini-site, reutilizadas pela página de catálogo. */
export function estiloMiniSite(site: Site): CSSProperties {
  const a = site.aparencia;
  return {
    background: a.corFundo,
    color: a.corTexto,
    fontFamily: fontes[a.fonte],
    ["--ms-primary" as string]: a.corPrimaria,
    ["--ms-radius" as string]: `${a.raio}px`,
    ["--ms-gap" as string]: espacos[a.espacamento],
    ["--ms-surface" as string]: hexToRgba(a.corTexto, 0.06),
    ["--ms-border" as string]: hexToRgba(a.corTexto, 0.14),
  } as CSSProperties;
}
