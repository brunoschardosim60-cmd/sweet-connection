import { uid } from "./utils";

export type TipoMidia = "imagem" | "video";

export interface Midia {
  id: string;
  nome: string;
  tipo: TipoMidia;
  url: string;
  tamanho: number;
  criadoEm: string;
}

const CHAVE = "nexa.midias.v1";
/** Limite prático para caber no localStorage sem estourar a cota. */
export const LIMITE_BYTES = 4 * 1024 * 1024;

const temStorage = () => typeof window !== "undefined" && !!window.localStorage;

function ler(): Midia[] {
  if (!temStorage()) return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as Midia[]) : [];
  } catch {
    return [];
  }
}

let cache: Midia[] | null = null;
const ouvintes = new Set<() => void>();
const notificar = () => ouvintes.forEach((fn) => fn());

export const midiaStore = {
  subscribe(fn: () => void) {
    ouvintes.add(fn);
    return () => ouvintes.delete(fn);
  },
  get(): Midia[] {
    if (cache === null) cache = ler();
    return cache;
  },
  getServer: (): Midia[] => [],
  adicionar(midia: Midia) {
    const proximo = [midia, ...midiaStore.get()];
    cache = proximo;
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(proximo));
    } catch {
      cache = proximo.slice(1);
      throw new Error("Espaço local esgotado. Remova mídias antigas antes de enviar outra.");
    }
    notificar();
  },
  remover(id: string) {
    cache = midiaStore.get().filter((m) => m.id !== id);
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(cache));
    } catch {
      /* ignorado */
    }
    notificar();
  },
};

export function arquivoParaDataUrl(arquivo: File) {
  return new Promise<string>((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    leitor.readAsDataURL(arquivo);
  });
}

/** Envia um arquivo para a biblioteca local e devolve a mídia criada. */
export async function enviarArquivo(arquivo: File): Promise<Midia> {
  const tipo: TipoMidia = arquivo.type.startsWith("video") ? "video" : "imagem";
  if (arquivo.size > LIMITE_BYTES)
    throw new Error(
      `Arquivo muito grande (${(arquivo.size / 1024 / 1024).toFixed(1)} MB). O limite é 4 MB.`,
    );
  const url = await arquivoParaDataUrl(arquivo);
  const midia: Midia = {
    id: uid("mid"),
    nome: arquivo.name.replace(/\.[^.]+$/, ""),
    tipo,
    url,
    tamanho: arquivo.size,
    criadoEm: new Date().toISOString(),
  };
  midiaStore.adicionar(midia);
  return midia;
}

/** Converte links de YouTube/Vimeo em URL de incorporação. */
export function urlEmbed(url: string): { tipo: "iframe" | "arquivo"; src: string } | null {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  if (yt) return { tipo: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vi = url.match(/vimeo\.com\/(\d+)/);
  if (vi) return { tipo: "iframe", src: `https://player.vimeo.com/video/${vi[1]}` };
  return { tipo: "arquivo", src: url };
}
