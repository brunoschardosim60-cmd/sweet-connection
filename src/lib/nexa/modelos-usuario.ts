import type { Aparencia, LayoutModelo } from "./types";
import { uid } from "./utils";

/**
 * Modelos criados pelo próprio usuário a partir da aparência de um projeto.
 * Ficam apenas como preferência de interface neste navegador — nenhum dado de
 * negócio é guardado aqui.
 */
export interface ModeloUsuario {
  id: string;
  nome: string;
  criadoEm: string;
  aparencia: Aparencia;
}

const CHAVE = "nexa.modelos-usuario.v1";

let cache: ModeloUsuario[] | null = null;
const ouvintes = new Set<() => void>();

function ler(): ModeloUsuario[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    const lista = bruto ? (JSON.parse(bruto) as ModeloUsuario[]) : [];
    cache = Array.isArray(lista) ? lista : [];
  } catch {
    cache = [];
  }
  return cache;
}

function gravar(lista: ModeloUsuario[]) {
  cache = lista;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    /* armazenamento indisponível: mantém apenas em memória */
  }
  ouvintes.forEach((fn) => fn());
}

export const modelosUsuarioStore = {
  subscribe(fn: () => void) {
    ouvintes.add(fn);
    return () => ouvintes.delete(fn);
  },
  get: (): ModeloUsuario[] => ler(),
  getServer: (): ModeloUsuario[] => [],
  salvar(nome: string, aparencia: Aparencia): ModeloUsuario {
    const modelo: ModeloUsuario = {
      id: uid("meu-modelo"),
      nome: nome.trim() || "Meu modelo",
      criadoEm: new Date().toISOString(),
      aparencia: { ...aparencia },
    };
    gravar([...ler(), modelo]);
    return modelo;
  },
  remover(id: string) {
    gravar(ler().filter((m) => m.id !== id));
  },
};

/** Aparência padrão usada pelo modelo "Personalizado (do zero)". */
export const aparenciaPersonalizada = (layout: LayoutModelo = "minimalista"): Aparencia => ({
  corPrimaria: "#111111",
  corFundo: "#ffffff",
  corTexto: "#141414",
  fonte: "moderna",
  raio: 16,
  botao: "solido",
  tema: "claro",
  animacoes: true,
  espacamento: "confortavel",
  layout,
  capaTipo: "cor",
  logoFormato: "redondo",
});
