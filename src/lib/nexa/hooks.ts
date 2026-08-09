import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { store } from "./storage";
import type { Site } from "./types";

const vazio = { sites: [] as Site[], envios: [], pronto: false };

export function useNexa() {
  const estado = useSyncExternalStore(
    store.subscribe,
    store.get,
    () => vazio as ReturnType<typeof store.get>,
  );

  useEffect(() => {
    void store.carregar();
  }, []);

  return { ...estado, store };
}

export function useSite(id?: string) {
  const { sites, pronto } = useNexa();
  return { site: sites.find((s) => s.id === id), pronto };
}

export function useSitePorSlug(slug?: string) {
  const { sites, pronto } = useNexa();
  return { site: sites.find((s) => s.slug === slug), pronto };
}

/** Histórico de desfazer/refazer em memória para o editor. */
export function useHistorico<T>(atual: T) {
  const [pilha, setPilha] = useState<T[]>([]);
  const [refazer, setRefazer] = useState<T[]>([]);

  const registrar = useCallback((anterior: T) => {
    setPilha((p) => [...p.slice(-29), anterior]);
    setRefazer([]);
  }, []);

  const desfazer = useCallback(() => {
    let valor: T | undefined;
    setPilha((p) => {
      if (p.length === 0) return p;
      valor = p[p.length - 1];
      return p.slice(0, -1);
    });
    if (valor !== undefined) setRefazer((r) => [...r, atual]);
    return valor;
  }, [atual]);

  const refazerAcao = useCallback(() => {
    let valor: T | undefined;
    setRefazer((r) => {
      if (r.length === 0) return r;
      valor = r[r.length - 1];
      return r.slice(0, -1);
    });
    if (valor !== undefined) setPilha((p) => [...p, atual]);
    return valor;
  }, [atual]);

  return {
    registrar,
    desfazer,
    refazer: refazerAcao,
    podeDesfazer: pilha.length > 0,
    podeRefazer: refazer.length > 0,
  };
}

export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}
