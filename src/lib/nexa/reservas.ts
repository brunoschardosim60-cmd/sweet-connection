import { supabase } from "@/integrations/supabase/client";

const mensagens: Record<string, string> = {
  minisite_indisponivel: "Esta pousada não está aceitando reservas agora.",
  checkin_invalido: "Escolha uma data de chegada a partir de hoje.",
  periodo_invalido: "A saída precisa ser posterior à chegada.",
  hospedes_invalidos: "Informe entre 1 e 30 hóspedes.",
  nome_invalido: "Informe seu nome completo.",
  periodo_indisponivel: "Essas datas já não estão disponíveis. Escolha outro período.",
  rate_limit_exceeded: "Aguarde um pouco antes de tentar outra reserva.",
};

export type ReservaHospedagemConfirmada = {
  id: string;
  token: string;
  checkIn: string;
  checkOut: string;
  repetido: boolean;
};

export async function reservarHospedagem(entrada: {
  slug: string;
  checkIn: string;
  checkOut: string;
  acomodacao?: string;
  hospedes: number;
  nome: string;
  telefone: string;
  email: string;
  observacao?: string;
  chave?: string;
}): Promise<ReservaHospedagemConfirmada> {
  const rpc = supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await rpc("nexa_reservar_hospedagem", {
    requested_slug: entrada.slug,
    requested_check_in: entrada.checkIn,
    requested_check_out: entrada.checkOut,
    requested_acomodacao: entrada.acomodacao ?? "principal",
    requested_hospedes: entrada.hospedes,
    requested_nome: entrada.nome,
    requested_telefone: entrada.telefone,
    requested_email: entrada.email,
    requested_observacao: entrada.observacao ?? "",
    requested_chave: entrada.chave ?? null,
  });
  if (error) {
    const chave = Object.keys(mensagens).find((item) => error.message.includes(item));
    throw new Error(chave ? mensagens[chave] : "Não foi possível confirmar a reserva agora.");
  }
  const retorno = (data ?? {}) as Record<string, unknown>;
  return {
    id: String(retorno["id"] ?? ""),
    token: String(retorno["token"] ?? ""),
    checkIn: String(retorno["check_in"] ?? entrada.checkIn),
    checkOut: String(retorno["check_out"] ?? entrada.checkOut),
    repetido: retorno["repetido"] === true,
  };
}
