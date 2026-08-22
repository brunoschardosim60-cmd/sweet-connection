import type { Aparencia, LayoutModelo } from "./types";
import { uid } from "./utils";

/**
 * Modelos criados pelo próprio usuário a partir da aparência de um projeto.
 * Ficam apenas como preferência de interface neste navegador — nunca devem
 * aparecer para outra conta que use o mesmo navegador.
 */
export interface ModeloUsuario {
  id: string;
  nome: string;
  criadoEm: string;
  aparencia: Aparencia;
}

const PREFIXO_CHAVE = "nexa.modelos-usuario.v2";

let cache: ModeloUsuario[] | null = null;
let ownerId: string | null = null;
const ouvintes = new Set<() => void>();

function chaveDaConta() {
  return ownerId ? `${PREFIXO_CHAVE}:${ownerId}` : null;
}

function ler(): ModeloUsuario[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  try {
    const chave = chaveDaConta();
    if (!chave) return [];
    const bruto = window.localStorage.getItem(chave);
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
    const chave = chaveDaConta();
    if (chave) window.localStorage.setItem(chave, JSON.stringify(lista));
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
  definirConta(id: string | null) {
    if (ownerId === id) return;
    ownerId = id;
    cache = null;
    ouvintes.forEach((fn) => fn());
  },
  salvar(nome: string, aparencia: Aparencia): ModeloUsuario {
    if (!ownerId) throw new Error("Sua sessão expirou. Entre novamente para salvar um modelo.");
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
  reset() {
    ownerId = null;
    cache = null;
    ouvintes.forEach((fn) => fn());
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
