import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { otimizarImagem } from "./otimizar-imagem";

export type TipoMidia = "imagem" | "video";

export interface Midia {
  id: string;
  nome: string;
  tipo: TipoMidia;
  url: string;
  tamanho: number;
  criadoEm: string;
  caminho: string;
}

const BUCKET = "nexa-media";
export const LIMITE_BYTES = 10 * 1024 * 1024;
const MIME_PERMITIDOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
]);

type MediaRow = Database["public"]["Tables"]["media"]["Row"];
let cache: Midia[] = [];
let carregando = false;
const ouvintes = new Set<() => void>();
const notificar = () => ouvintes.forEach((fn) => fn());

function paraMidia(row: MediaRow): Midia {
  const { data } = supabase.storage.from(row.bucket).getPublicUrl(row.object_path);
  return {
    id: row.id,
    nome: row.original_name || row.object_path.split("/").pop() || "Mídia",
    tipo: row.mime_type.startsWith("video/") ? "video" : "imagem",
    url: data.publicUrl,
    tamanho: row.size_bytes,
    criadoEm: row.created_at,
    caminho: row.object_path,
  };
}

export const midiaStore = {
  subscribe(fn: () => void) {
    ouvintes.add(fn);
    return () => ouvintes.delete(fn);
  },
  get: () => cache,
  getServer: () => [] as Midia[],
  async carregar(forcar = false) {
    if (carregando || (!forcar && cache.length > 0)) return;
    carregando = true;
    try {
      const { data, error } = await supabase
        .from("media")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      cache = data.map(paraMidia);
      notificar();
    } finally {
      carregando = false;
    }
  },
  adicionar(midia: Midia) {
    cache = [midia, ...cache];
    notificar();
  },
  async remover(id: string) {
    const midia = cache.find((item) => item.id === id);
    if (!midia) return;
    const storageResult = await supabase.storage.from(BUCKET).remove([midia.caminho]);
    if (storageResult.error) throw new Error(storageResult.error.message);
    const { error } = await supabase.from("media").delete().eq("id", id);
    if (error) throw new Error(error.message);
    cache = cache.filter((item) => item.id !== id);
    notificar();
  },
  async removerTudo() {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new Error("Sua sessão expirou. Entre novamente.");

    // Always list from the beginning after each batch: removed objects no
    // longer occupy offsets, and the loop also covers accounts above 1,000 files.
    while (true) {
      const listed = await supabase.storage.from(BUCKET).list(auth.user.id, { limit: 100 });
      if (listed.error) throw new Error(listed.error.message);
      if (listed.data.length === 0) break;

      const caminhos = listed.data.map((item) => `${auth.user!.id}/${item.name}`);
      const { error } = await supabase.storage.from(BUCKET).remove(caminhos);
      if (error) throw new Error(error.message);
    }
    cache = [];
    notificar();
  },
  reset() {
    cache = [];
    carregando = false;
    notificar();
  },
};

export async function enviarArquivo(original: File): Promise<Midia> {
  // Fotos são redimensionadas e convertidas para WebP antes do envio.
  const arquivo = await otimizarImagem(original);
  if (!MIME_PERMITIDOS.has(arquivo.type)) {
    throw new Error("Formato não permitido. Use JPG, PNG, WebP, GIF, MP4 ou WebM.");
  }
  if (arquivo.size < 1 || arquivo.size > LIMITE_BYTES) {
    throw new Error(
      `Arquivo muito grande (${(arquivo.size / 1024 / 1024).toFixed(1)} MB). O limite é 10 MB.`,
    );
  }

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Sua sessão expirou. Entre novamente.");

  const extensao =
    arquivo.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "bin";
  const caminho = `${auth.user.id}/${crypto.randomUUID()}.${extensao}`;
  const upload = await supabase.storage.from(BUCKET).upload(caminho, arquivo, {
    cacheControl: "31536000",
    contentType: arquivo.type,
    upsert: false,
  });
  if (upload.error) throw new Error(upload.error.message);

  const created = await supabase
    .from("media")
    .insert({
      owner_id: auth.user.id,
      bucket: BUCKET,
      object_path: caminho,
      mime_type: arquivo.type,
      size_bytes: arquivo.size,
      original_name: arquivo.name.slice(0, 240),
    })
    .select("*")
    .single();

  if (created.error) {
    await supabase.storage.from(BUCKET).remove([caminho]);
    throw new Error(created.error.message);
  }

  const midia = paraMidia(created.data);
  midiaStore.adicionar(midia);
  return midia;
}

export function urlEmbed(url: string): { tipo: "iframe" | "arquivo"; src: string } | null {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  if (yt) return { tipo: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vi = url.match(/vimeo\.com\/(\d+)/);
  if (vi) return { tipo: "iframe", src: `https://player.vimeo.com/video/${vi[1]}` };
  return { tipo: "arquivo", src: url };
}
