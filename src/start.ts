import { createStart, createMiddleware } from "@tanstack/react-start";

import { requisicaoCsrfPermitida } from "./lib/csrf";
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

// Mantém a proteção padrão de server functions sem importar o helper
// isomórfico que causava falha de hidratação no navegador. As rotas de API,
// como o webhook Asaas, continuam usando sua autenticação dedicada.
const csrfMiddleware = createMiddleware().server(async ({ next, request, handlerType }) => {
  if (handlerType !== "serverFn" || requisicaoCsrfPermitida(request)) return next();
  return new Response("Origem não permitida.", { status: 403 });
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
