import { useCallback, useEffect, useState } from "react";

/** Preferência visual de tema (apenas interface, guardada no navegador). */
export type Tema = "claro" | "escuro";

const CHAVE = "nexa.tema.v1";

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
    if (!pronto) return;
    document.documentElement.classList.toggle("dark", tema === "escuro");
    document.documentElement.style.colorScheme = tema === "escuro" ? "dark" : "light";
    try {
      window.localStorage.setItem(CHAVE, tema);
    } catch {
      /* armazenamento indisponível */
    }
  }, [tema, pronto]);

  const alternar = useCallback(() => definirTema((t) => (t === "escuro" ? "claro" : "escuro")), []);

  return { tema, escuro: tema === "escuro", alternar, pronto };
}
