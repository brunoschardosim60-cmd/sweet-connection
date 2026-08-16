import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { analytics } from "./analytics";
import { marcaStore } from "./marca";
import { store } from "./storage";
import type { Site } from "./types";

const mapaVazio: ReturnType<typeof analytics.tudo> = {};

const vazio = {
  sites: [] as Site[],
  envios: [],
  pronto: false,
  carregando: false,
  erro: null,
  ownerId: null,
};

export function useNexa() {
  const estado = useSyncExternalStore(
    store.subscribe,
    store.get,
    () => vazio as ReturnType<typeof store.get>,
  );

  useEffect(() => {
    void store.carregar();

    const atualizarAoRetomar = () => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        void store.carregar(true);
      }
    };
    window.addEventListener("focus", atualizarAoRetomar);
    document.addEventListener("visibilitychange", atualizarAoRetomar);
    return () => {
      window.removeEventListener("focus", atualizarAoRetomar);
      document.removeEventListener("visibilitychange", atualizarAoRetomar);
    };
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
  const pilhaRef = useRef<T[]>([]);
  const refazerRef = useRef<T[]>([]);

  const registrar = useCallback((anterior: T) => {
    const proximaPilha = [...pilhaRef.current.slice(-29), anterior];
    pilhaRef.current = proximaPilha;
    refazerRef.current = [];
    setPilha(proximaPilha);
    setRefazer([]);
  }, []);

  const desfazer = useCallback(() => {
    const existente = pilhaRef.current;
    if (existente.length === 0) return undefined;

    const valor = existente[existente.length - 1];
    const proximaPilha = existente.slice(0, -1);
    const proximoRefazer = [...refazerRef.current.slice(-29), atual];
    pilhaRef.current = proximaPilha;
    refazerRef.current = proximoRefazer;
    setPilha(proximaPilha);
    setRefazer(proximoRefazer);
    return valor;
  }, [atual]);

  const refazerAcao = useCallback(() => {
    const existente = refazerRef.current;
    if (existente.length === 0) return undefined;

    const valor = existente[existente.length - 1];
    const proximoRefazer = existente.slice(0, -1);
    const proximaPilha = [...pilhaRef.current.slice(-29), atual];
    refazerRef.current = proximoRefazer;
    pilhaRef.current = proximaPilha;
    setRefazer(proximoRefazer);
    setPilha(proximaPilha);
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

/** Visitas, cliques e formulários centralizados no Supabase. */
export function useDesempenho() {
  const desempenho = useSyncExternalStore(analytics.subscribe, analytics.tudo, () => mapaVazio);
  useEffect(() => {
    void analytics.carregar().catch(() => undefined);
  }, []);
  return desempenho;
}

/** Identidade white label da plataforma (nome, logo, domínio, contatos). */
export function useMarca() {
  const marca = useSyncExternalStore(marcaStore.subscribe, marcaStore.get, marcaStore.servidor);
  useEffect(() => {
    void marcaStore.carregar().catch(() => undefined);
  }, []);
  return marca;
}
