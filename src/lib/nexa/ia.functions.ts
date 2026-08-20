import { createServerFn } from "@tanstack/react-start";
import { gerarPlano, type EntradaPlano } from "./ia.server";

export const gerarPlanoSite = createServerFn({ method: "POST" })
  .validator((data: EntradaPlano) => data)
  .handler(async ({ data }) => gerarPlano(data));
