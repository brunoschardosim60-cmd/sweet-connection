/** Caminho público padrão de um mini-site. */
export const caminhoSite = (slug: string) => `/site/${slug}`;

/** Endereço completo exibido/copiado para um mini-site. */
function normalizarOrigem(valor: string | undefined) {
  const candidato = valor?.trim();
  if (!candidato) return "";

  try {
    const url = new URL(/^https?:\/\//i.test(candidato) ? candidato : `https://${candidato}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

/** Origem real do host atual ou a URL pÃºblica configurada no build de produÃ§Ã£o. */
export function origemPublica() {
  if (typeof window !== "undefined") return window.location.origin;
  return normalizarOrigem(import.meta.env["VITE_PUBLIC_SITE_URL"]);
}

/** EndereÃ§o completo exibido/copiado para um mini-site. */
export const enderecoSite = (slug: string, origem = origemPublica()) =>
  `${origem.replace(/\/+$/, "")}${caminhoSite(slug)}`;

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
