import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { brand } from "./brand";

export interface Marca {
  nome: string;
  slogan: string;
  dominio: string;
  emailContato: string;
  whatsappComercial: string;
  instagram: string;
  assinatura: string;
  mostrarAssinatura: boolean;
  logo: string;
}

export const marcaPadrao: Marca = {
  nome: brand.nome,
  slogan: brand.slogan,
  dominio: brand.dominio,
  emailContato: brand.emailContato,
  whatsappComercial: brand.whatsappComercial,
  instagram: brand.instagram,
  assinatura: brand.assinatura,
  mostrarAssinatura: true,
  logo: "",
};

let cache: Marca = marcaPadrao;
let ownerId: string | null = null;
let carregando = false;
let fila: Promise<void> = Promise.resolve();
const ouvintes = new Set<() => void>();
const notificar = () => ouvintes.forEach((fn) => fn());

async function usuarioAtual() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sua sessão expirou. Entre novamente.");
  return data.user.id;
}

async function persistir(id: string, marca: Marca) {
  const { error } = await supabase.from("platform_settings").upsert({
    owner_id: id,
    settings: marca as unknown as Json,
  });
  if (error) throw new Error(error.message);
}

export const marcaStore = {
  subscribe(fn: () => void) {
    ouvintes.add(fn);
    return () => ouvintes.delete(fn);
  },
  get: () => cache,
  servidor: () => marcaPadrao,
  async carregar() {
    if (carregando) return;
    carregando = true;
    try {
      const id = await usuarioAtual();
      if (ownerId === id) return;
      const { data, error } = await supabase
        .from("platform_settings")
        .select("settings")
        .eq("owner_id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      ownerId = id;
      cache = data?.settings
        ? { ...marcaPadrao, ...(data.settings as unknown as Partial<Marca>) }
        : marcaPadrao;
      notificar();
    } finally {
      carregando = false;
    }
  },
  salvar(patch: Partial<Marca>) {
    cache = { ...cache, ...patch };
    const snapshot = cache;
    notificar();
    fila = fila
      .catch(() => undefined)
      .then(async () => {
        const id = ownerId ?? (await usuarioAtual());
        ownerId = id;
        // Uses the newest cache when queued changes are eventually persisted.
        await persistir(id, cache === snapshot ? snapshot : cache);
      });
    return fila;
  },
  async restaurar() {
    const id = ownerId ?? (await usuarioAtual());
    const { error } = await supabase.from("platform_settings").delete().eq("owner_id", id);
    if (error) throw new Error(error.message);
    cache = marcaPadrao;
    ownerId = id;
    notificar();
  },
  reset() {
    cache = marcaPadrao;
    ownerId = null;
    carregando = false;
    fila = Promise.resolve();
    notificar();
  },
};

export const hostMarca = (m: Marca) =>
  m.dominio.replace(/^https?:\/\//, "").replace(/\/+$/, "") || brand.dominio;
