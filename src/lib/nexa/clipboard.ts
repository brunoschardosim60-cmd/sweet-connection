/** Caminho público padrão de um mini-site. */
export const caminhoSite = (slug: string) => `/site/${slug}`;

/** Endereço completo exibido/copiado para um mini-site. */
export const enderecoSite = (host: string, slug: string) => `https://${host}${caminhoSite(slug)}`;

/**
 * Copia um texto e confirma o resultado.
 * Retorna `true` apenas quando o navegador confirma a cópia.
 */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    /* bloqueado pelo navegador */
  }
  return false;
}
