import { createServerFn } from "@tanstack/react-start";
import { gerarPlano, type EntradaPlano } from "./ia.server";

export type PedidoDePlanoIA = {
  entrada: EntradaPlano;
  /** Sessão Supabase atual, validada no servidor antes de chamar o provedor de IA. */
  accessToken: string;
};

export const gerarPlanoSite = createServerFn({ method: "POST" })
  .validator((data: PedidoDePlanoIA) => data)
  .handler(async ({ data }) => gerarPlano(data.entrada, data.accessToken));
