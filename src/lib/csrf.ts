/**
 * Reproduz a validação padrão do TanStack Start sem importar o helper
 * isomórfico no bundle do navegador. Server functions são RPCs same-origin;
 * rotas de API possuem autenticação própria (Bearer/token de webhook).
 */
export function requisicaoCsrfPermitida(request: Pick<Request, "url" | "headers">) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null) return fetchSite === "same-origin";

  const origem = request.headers.get("origin");
  if (origem !== null) return origem === new URL(request.url).origin;

  const referer = request.headers.get("referer");
  if (referer === null) return false;
  try {
    return new URL(referer).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
