import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { EntradaPlano } from "./ia.server";
import type { PlanoIA } from "./ia-tipos";
import { esquemaPlanoIA } from "./ia-experiencia";

const VERSAO_DO_PROMPT = "nexa-ai-v7-experiencia";
const DURACAO_CACHE_DIAS = 1;

function entradaNormalizada(entrada: EntradaPlano) {
  return JSON.stringify({
    versao: VERSAO_DO_PROMPT,
    empresa: entrada.empresa.trim().toLocaleLowerCase("pt-BR"),
    nicho: entrada.nicho.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR"),
    cidade: entrada.cidade?.trim().toLocaleLowerCase("pt-BR") ?? "",
    estado: entrada.estado?.trim().toUpperCase() ?? "",
    logo: entrada.logo ?? "",
    capa: entrada.capa ?? "",
    imagens: entrada.imagens ?? [],
    fotosProdutos: entrada.fotosProdutos ?? [],
    publico: entrada.publico ?? "",
    diferenciais: entrada.diferenciais ?? "",
    oferta: entrada.oferta ?? "",
    objetivo: entrada.objetivo ?? "apresentar",
    tipoProjeto: entrada.tipoProjeto ?? "minisite",
    ajuste: entrada.ajuste ?? null,
    estilo: entrada.estilo ?? "automatico",
    tema: entrada.tema ?? "automatico",
    ocrCardapio: entrada.ocrCardapio ?? false,
  });
}

async function hashDaEntrada(entrada: EntradaPlano): Promise<string> {
  const bytes = new TextEncoder().encode(entradaNormalizada(entrada));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function planoValido(valor: unknown): valor is PlanoIA {
  return esquemaPlanoIA.safeParse(valor).success;
}

/** Retorna somente planos da própria conta; uma geração nunca é compartilhada entre clientes. */
export async function buscarPlanoEmCache(entrada: EntradaPlano): Promise<PlanoIA | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const requestHash = await hashDaEntrada(entrada);
  const { data, error } = await supabase
    .from("ai_generation_cache")
    .select("plan")
    .eq("owner_id", auth.user.id)
    .eq("request_hash", requestHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !planoValido(data?.plan)) return null;
  return data.plan;
}

/** Falhas de cache não impedem uma geração válida; apenas deixam de economizar créditos. */
export async function guardarPlanoEmCache(entrada: EntradaPlano, plano: PlanoIA): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const requestHash = await hashDaEntrada(entrada);
  const expiraEm = new Date();
  expiraEm.setDate(expiraEm.getDate() + DURACAO_CACHE_DIAS);
  // Só limita a vida do cache; a autorização do token continua exclusiva do servidor.
  try {
    const payload = plano.sessaoAjustes?.split(".")[0];
    if (payload) {
      const expiracao = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).expira;
      if (typeof expiracao === "number" && Number.isFinite(expiracao))
        expiraEm.setTime(Math.min(expiraEm.getTime(), expiracao));
    }
  } catch {
    /* Cache antigo sem sessão: usa a duração curta padrão. */
  }
  await supabase.from("ai_generation_cache").upsert(
    {
      owner_id: auth.user.id,
      request_hash: requestHash,
      plan: plano as unknown as Json,
      expires_at: expiraEm.toISOString(),
    },
    { onConflict: "owner_id,request_hash" },
  );
}
