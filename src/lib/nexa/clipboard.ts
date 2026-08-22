/** Caminho público padrão de um mini-site. */
export const caminhoSite = (slug: string) => `/site/${slug}`;

/** Endereço atualmente publicado, usado apenas quando a variável de produção ainda não foi definida. */
const ORIGEM_PUBLICA_PADRAO = "https://nexa-xi-puce.vercel.app";

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

/** Origem real do host atual ou a URL pública configurada no build de produção. */
export function origemPublica() {
  if (typeof window !== "undefined") return window.location.origin;
  return normalizarOrigem(import.meta.env["VITE_PUBLIC_SITE_URL"]) || ORIGEM_PUBLICA_PADRAO;
}

/** Endereço completo exibido/copiado para um mini-site. */
export const enderecoSite = (slug: string, origem = origemPublica()) =>
  `${origem.replace(/\/+$/, "")}${caminhoSite(slug)}`;

/** Converte caminhos de assets em URLs absolutas para Open Graph e JSON-LD. */
export function urlPublica(valor: string | undefined, origem = origemPublica()) {
  const candidato = valor?.trim();
  if (!candidato) return "";
  try {
    return new URL(candidato, `${origem.replace(/\/+$/, "")}/`).href;
  } catch {
    return "";
  }
}

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
