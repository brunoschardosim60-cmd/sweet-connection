import { supabase } from "@/integrations/supabase/client";
import type { Json, MinisiteRow } from "@/integrations/supabase/types";
import type { EnvioFormulario, Site, StatusSite } from "./types";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mensagemErro(error: { message: string; code?: string }) {
  if (error.code === "23505") return "Este endereço já está sendo usado por outro mini-site.";
  if (error.code === "PGRST202") {
    return "O banco ainda não recebeu as migrations da Nexa.";
  }
  if (error.code === "42501") return "Sua conta não tem permissão para alterar estes dados.";
  return error.message;
}

function linhaParaSite(row: MinisiteRow): Site {
  const draft = row.draft_content as unknown as Site;
  return {
    ...draft,
    id: row.id,
    slug: row.slug,
    status: row.status,
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

function clienteJson(site: Site): Json {
  return {
    company: site.cliente.empresa,
    segment: site.cliente.segmento,
    contact_name: site.cliente.responsavel,
    phone: site.cliente.telefone,
    email: site.cliente.email,
    city: site.cliente.cidade,
    state: site.cliente.estado,
  };
}

function comoLinha(data: MinisiteRow | MinisiteRow[]): MinisiteRow {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("O Supabase não retornou o mini-site salvo.");
  return row;
}

export const supabaseRepository = {
  async usuarioAtual() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw new Error("Sua sessão expirou. Entre novamente.");
    return data.user.id;
  },

  async listarSites(): Promise<Site[]> {
    const { data, error } = await supabase
      .from("minisites")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(mensagemErro(error));
    return data.map(linhaParaSite);
  },

  async salvarSite(site: Site): Promise<Site> {
    const { data, error } = await supabase.rpc("save_minisite_draft", {
      requested_slug: site.slug,
      site_content: site as unknown as Json,
      client_content: clienteJson(site),
      ...(uuid.test(site.id) ? { requested_id: site.id } : {}),
    });
    if (error) throw new Error(mensagemErro(error));
    return linhaParaSite(comoLinha(data));
  },

  async publicarSite(site: Site): Promise<Site> {
    const draft = await this.salvarSite(site);
    const { data, error } = await supabase.rpc("publish_minisite", { requested_id: draft.id });
    if (error) throw new Error(mensagemErro(error));
    return linhaParaSite(comoLinha(data));
  },

  async definirStatus(site: Site, status: Exclude<StatusSite, "publicado">): Promise<Site> {
    const { data, error } = await supabase.rpc("set_minisite_status", {
      requested_id: site.id,
      requested_status: status,
    });
    if (error) throw new Error(mensagemErro(error));
    return linhaParaSite(comoLinha(data));
  },

  async removerSite(id: string) {
    const { error } = await supabase.rpc("delete_minisite", { requested_id: id });
    if (error) throw new Error(mensagemErro(error));
  },

  async listarEnvios(): Promise<EnvioFormulario[]> {
    const { data, error } = await supabase
      .from("form_submissions")
      .select("id,minisite_id,payload,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(mensagemErro(error));
    return data.map((row) => ({
      id: row.id,
      siteId: row.minisite_id,
      criadoEm: row.created_at,
      dados: row.payload as Record<string, string>,
    }));
  },

  async limparTudo() {
    const { error } = await supabase.rpc("clear_nexa_account");
    if (error) throw new Error(mensagemErro(error));
  },
};
