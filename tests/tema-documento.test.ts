import { describe, expect, it } from "vitest";
import {
  aplicarTemaDocumento,
  capturarEstadoTema,
  restaurarEstadoTema,
  type AlvoTemaDocumento,
} from "@/lib/nexa/tema";

function criarAlvo(escuroInicial = false, colorScheme = "") {
  let escuro = escuroInicial;
  const alvo: AlvoTemaDocumento = {
    classList: {
      contains: (token) => token === "dark" && escuro,
      toggle: (token, force) => {
        if (token === "dark") escuro = force ?? !escuro;
        return escuro;
      },
    },
    style: { colorScheme },
  };
  return { alvo, estaEscuro: () => escuro };
}

describe("tema global do painel", () => {
  it("aplica os temas claro e escuro ao documento", () => {
    const { alvo, estaEscuro } = criarAlvo();

    aplicarTemaDocumento(alvo, "escuro");
    expect(estaEscuro()).toBe(true);
    expect(alvo.style.colorScheme).toBe("dark");

    aplicarTemaDocumento(alvo, "claro");
    expect(estaEscuro()).toBe(false);
    expect(alvo.style.colorScheme).toBe("light");
  });

  it("restaura o estado anterior quando o painel é desmontado", () => {
    const { alvo, estaEscuro } = criarAlvo(false, "");
    const anterior = capturarEstadoTema(alvo);

    aplicarTemaDocumento(alvo, "escuro");
    restaurarEstadoTema(alvo, anterior);

    expect(estaEscuro()).toBe(false);
    expect(alvo.style.colorScheme).toBe("");
  });

  it("preserva um estado escuro que já existia antes do painel", () => {
    const { alvo, estaEscuro } = criarAlvo(true, "dark");
    const anterior = capturarEstadoTema(alvo);

    aplicarTemaDocumento(alvo, "claro");
    restaurarEstadoTema(alvo, anterior);

    expect(estaEscuro()).toBe(true);
    expect(alvo.style.colorScheme).toBe("dark");
  });
});
