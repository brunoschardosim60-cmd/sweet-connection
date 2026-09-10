/** Só aceita destinos internos do painel; nunca redireciona para outro domínio. */
export function retornoSeguro(valor: unknown): string {
  if (
    typeof valor !== "string" ||
    valor.includes("\\") ||
    [...valor].some((c) => c.charCodeAt(0) <= 32)
  )
    return "/painel";
  if (!/^\/(?:painel|operacao|entrega)(?:\/|\?|#|$)/.test(valor)) return "/painel";
  const url = new URL(valor, "https://nexa.invalid");
  if (
    url.origin !== "https://nexa.invalid" ||
    !/^\/(?:painel|operacao|entrega)(?:\/|$)/.test(url.pathname)
  ) {
    return "/painel";
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function buscaAuth(search: Record<string, unknown>): { retorno?: string } {
  return search["retorno"] === undefined ? {} : { retorno: retornoSeguro(search["retorno"]) };
}

/** O painel ainda pode estar montado durante a transição para /login. */
export function destinoAutenticacao(pathname: string, search = "", hash = ""): string | undefined {
  if (pathname !== "/painel" && !pathname.startsWith("/painel/")) return undefined;
  return retornoSeguro(`${pathname}${search}${hash ? `#${hash}` : ""}`);
}
