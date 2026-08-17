/** Largura máxima usada para fotos enviadas pelo painel. */
export const LARGURA_MAXIMA = 1600;

const OTIMIZAVEIS = new Set(["image/jpeg", "image/png", "image/webp"]);

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
export async function otimizarImagem(
  arquivo: File,
  larguraMaxima = LARGURA_MAXIMA,
): Promise<File> {
  if (typeof document === "undefined" || !OTIMIZAVEIS.has(arquivo.type)) return arquivo;

  const destino = suporta("image/avif") ? "image/avif" : suporta("image/webp") ? "image/webp" : "";
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

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, destino, 0.82),
    );
    if (!blob || blob.size >= arquivo.size) return arquivo;

    const nome = `${arquivo.name.replace(/\.[^.]+$/, "")}.${destino === "image/avif" ? "avif" : "webp"}`;
    return new File([blob], nome, { type: destino, lastModified: Date.now() });
  } catch {
    return arquivo;
  } finally {
    URL.revokeObjectURL(url);
  }
}
