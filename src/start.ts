import { createStart, createMiddleware } from "@tanstack/react-start";


import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Proteção CSRF própria: importar `createCsrfMiddleware` de
// "@tanstack/start-client-core" arrasta `node:async_hooks` para o bundle do
// navegador e derruba a hidratação (a página fica estática e as animações
// nunca aparecem). Aqui a checagem roda apenas no servidor, dentro de
// `.server()`, que é removido do bundle do cliente.
const csrfMiddleware = createMiddleware().server(async ({ next, request }) => {
  const metodo = request?.method?.toUpperCase() ?? "GET";
  const seguro = metodo === "GET" || metodo === "HEAD" || metodo === "OPTIONS";
  if (!seguro && request) {
    const site = request.headers.get("sec-fetch-site");
    if (site && site !== "same-origin" && site !== "none") {
      return new Response("Origem não permitida.", { status: 403 });
    }
    if (!site) {
      const origem = request.headers.get("origin") ?? request.headers.get("referer");
      if (origem) {
        try {
          if (new URL(origem).origin !== new URL(request.url).origin) {
            return new Response("Origem não permitida.", { status: 403 });
          }
        } catch {
          return new Response("Origem não permitida.", { status: 403 });
        }
      }
    }
  }
  return next();
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));

