import { useCallback, useEffect, useState } from "react";

/** Preferência visual de tema (apenas interface, guardada no navegador). */
export type Tema = "claro" | "escuro";

export interface AlvoTemaDocumento {
  classList: {
    contains(token: string): boolean;
    toggle(token: string, force?: boolean): boolean;
  };
  style: { colorScheme: string };
}

export type EstadoTemaDocumento = {
  escuro: boolean;
  colorScheme: string;
};

const CHAVE = "nexa.tema.v1";

export const capturarEstadoTema = (alvo: AlvoTemaDocumento): EstadoTemaDocumento => ({
  escuro: alvo.classList.contains("dark"),
  colorScheme: alvo.style.colorScheme,
});

export function aplicarTemaDocumento(alvo: AlvoTemaDocumento, tema: Tema) {
  alvo.classList.toggle("dark", tema === "escuro");
  alvo.style.colorScheme = tema === "escuro" ? "dark" : "light";
}

export function restaurarEstadoTema(alvo: AlvoTemaDocumento, estado: EstadoTemaDocumento) {
  alvo.classList.toggle("dark", estado.escuro);
  alvo.style.colorScheme = estado.colorScheme;
}

function lerTema(): Tema {
  if (typeof window === "undefined") return "claro";
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (bruto === "claro" || bruto === "escuro") return bruto;
  } catch {
    /* armazenamento indisponível */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
}

/** Aplica e persiste o tema, evitando flash: só age após a hidratação. */
export function useTema() {
  const [tema, definirTema] = useState<Tema>("claro");
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const inicial = lerTema();
    definirTema(inicial);
    setPronto(true);
  }, []);

  useEffect(() => {
    const raiz = document.documentElement;
    const estadoAnterior = capturarEstadoTema(raiz);
    return () => restaurarEstadoTema(raiz, estadoAnterior);
  }, []);

  useEffect(() => {
    if (!pronto) return;
    aplicarTemaDocumento(document.documentElement, tema);
    try {
      window.localStorage.setItem(CHAVE, tema);
    } catch {
      /* armazenamento indisponível */
    }
  }, [tema, pronto]);

  const alternar = useCallback(() => definirTema((t) => (t === "escuro" ? "claro" : "escuro")), []);

  return { tema, escuro: tema === "escuro", alternar, pronto };
}
