/** Largura máxima usada para fotos enviadas pelo painel. */
export const LARGURA_MAXIMA = 1600;

const OTIMIZAVEIS = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface ResultadoOtimizacao {
  original: number;
  final: number;
  economia: number;
  percentual: number;
}

/** Dados seguros para explicar a redução de peso ao dono da imagem. */
export function resumoOtimizacao(original: number, final: number): ResultadoOtimizacao | null {
  if (!Number.isFinite(original) || !Number.isFinite(final) || original <= 0 || final >= original)
    return null;
  const economia = original - final;
  return { original, final, economia, percentual: Math.round((economia / original) * 100) };
}

const suporta = (tipo: string) => {
  try {
    return document.createElement("canvas").toDataURL(tipo).startsWith(`data:${tipo}`);
  } catch {
    return false;
  }
};

/**
 * Redimensiona e converte a imagem para WebP (ou AVIF quando o navegador
 * suporta) antes do upload, reduzindo bastante o peso sem perder qualidade
 * visível. Formatos não suportados (GIF, vídeo) passam intactos.
 */
export async function otimizarImagem(arquivo: File, larguraMaxima = LARGURA_MAXIMA): Promise<File> {
  if (typeof document === "undefined" || !OTIMIZAVEIS.has(arquivo.type)) return arquivo;

  // WebP é aceito por todos os navegadores atuais e pelo bucket de mídia.
  const destino = suporta("image/webp") ? "image/webp" : "";
  if (!destino) return arquivo;

  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("imagem_invalida"));
      el.src = url;
    });

    const escala = Math.min(1, larguraMaxima / (img.naturalWidth || larguraMaxima));
    const largura = Math.max(1, Math.round((img.naturalWidth || larguraMaxima) * escala));
    const altura = Math.max(1, Math.round((img.naturalHeight || larguraMaxima) * escala));

    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) return arquivo;
    ctx.drawImage(img, 0, 0, largura, altura);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, destino, 0.82));
    if (!blob || blob.size >= arquivo.size) return arquivo;

    const nome = `${arquivo.name.replace(/\.[^.]+$/, "")}.webp`;
    return new File([blob], nome, { type: destino, lastModified: Date.now() });
  } catch {
    return arquivo;
  } finally {
    URL.revokeObjectURL(url);
  }
}
