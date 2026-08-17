import { supabase } from "@/integrations/supabase/client";
import type { HorarioDia, Site } from "./types";

/** Nomes de dia usados nos horários de funcionamento, na ordem de Date#getDay(). */
const diasPorIndice = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

const paraMinutos = (hora: string) => {
  const [h, m] = hora.split(":");
  return Number(h ?? 0) * 60 + Number(m ?? 0);
};

const paraHora = (minutos: number) =>
  `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;

/** Data no formato ISO (AAAA-MM-DD) sem conversão de fuso. */
export function dataIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Rótulo curto do dia (ex.: "Seg 18/08"). */
export function rotuloDia(d: Date): string {
  const nome = diasPorIndice[d.getDay()] ?? "";
  return `${nome.slice(0, 3)} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Próximos dias disponíveis a partir de hoje. */
export function proximosDias(quantidade = 14, base = new Date()): Date[] {
  return Array.from({ length: quantidade }, (_, i) => {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function horarioDoDia(horarios: HorarioDia[], data: Date): HorarioDia | null {
  const nome = diasPorIndice[data.getDay()];
  return horarios.find((h) => h.dia === nome) ?? null;
}

/**
 * Gera os horários possíveis de um dia a partir do funcionamento do negócio.
 * Horários já passados (quando a data é hoje) são descartados.
 */
export function horariosDoDia(
  horarios: HorarioDia[],
  data: Date,
  intervaloMinutos = 30,
  agora = new Date(),
): string[] {
  const dia = horarioDoDia(horarios, data);
  if (!dia || dia.fechado) return [];
  const inicio = paraMinutos(dia.abre);
  const fim = paraMinutos(dia.fecha);
  if (!Number.isFinite(inicio) || !Number.isFinite(fim) || fim <= inicio) return [];

  const ehHoje = dataIso(data) === dataIso(agora);
  const limiteAgora = agora.getHours() * 60 + agora.getMinutes();
  const passo = Math.max(10, intervaloMinutos);

  const lista: string[] = [];
  for (let m = inicio; m + passo <= fim; m += passo) {
    if (ehHoje && m <= limiteAgora) continue;
    lista.push(paraHora(m));
  }
  return lista;
}

/** Horários já confirmados por outros clientes naquele dia. */
export async function horariosOcupados(slug: string, data: string): Promise<string[]> {
  const { data: linhas, error } = await supabase.rpc("nexa_agenda_ocupados", {
    requested_slug: slug,
    requested_data: data,
  });
  if (error) throw new Error("Não foi possível carregar os horários disponíveis.");
  return (linhas ?? []).map((l) => l.hora);
}

const mensagensDeErro: Record<string, string> = {
  horario_ocupado: "Esse horário acabou de ser reservado. Escolha outro, por favor.",
  data_invalida: "Escolha uma data a partir de hoje.",
  hora_invalida: "Horário inválido.",
  nome_invalido: "Informe seu nome completo.",
  rate_limit_exceeded: "Muitos agendamentos seguidos. Tente novamente mais tarde.",
  minisite_indisponivel: "Este mini-site não está publicado.",
};

export type AgendamentoConfirmado = {
  id: string;
  token: string;
  data: string;
  hora: string;
  repetido: boolean;
};

/** Chave estável por tentativa: cliques repetidos reaproveitam o mesmo agendamento. */
export function novaChaveIdempotencia(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function agendarHorario(entrada: {
  slug: string;
  data: string;
  hora: string;
  nome: string;
  telefone: string;
  servico?: string;
  observacao?: string;
  chave?: string;
}): Promise<AgendamentoConfirmado> {
  const { data, error } = await supabase.rpc("nexa_agendar", {
    requested_slug: entrada.slug,
    requested_data: entrada.data,
    requested_hora: entrada.hora,
    requested_nome: entrada.nome,
    requested_telefone: entrada.telefone,
    requested_servico: entrada.servico ?? "",
    requested_observacao: entrada.observacao ?? "",
    requested_chave: entrada.chave ?? undefined,
  });
  if (error) {
    const chave = Object.keys(mensagensDeErro).find((k) => error.message.includes(k));
    throw new Error(
      chave ? mensagensDeErro[chave]! : "Não foi possível confirmar o agendamento agora.",
    );
  }
  const retorno = (data ?? {}) as Partial<AgendamentoConfirmado>;
  return {
    id: String(retorno.id ?? ""),
    token: String(retorno.token ?? ""),
    data: String(retorno.data ?? entrada.data),
    hora: String(retorno.hora ?? entrada.hora),
    repetido: retorno.repetido === true,
  };
}

export type ResumoAgendamento = {
  id: string;
  data: string;
  hora: string;
  servico: string;
  nome: string;
  telefone: string;
  status: string;
  slug: string;
  negocio: string;
  whatsapp: string;
};

/** Resumo público de um agendamento a partir do código recebido pelo cliente. */
export async function buscarAgendamento(token: string): Promise<ResumoAgendamento | null> {
  const { data, error } = await supabase.rpc("nexa_agendamento_por_token", {
    requested_token: token,
  });
  if (error) throw new Error("Não foi possível carregar o agendamento.");
  return (data as ResumoAgendamento | null) ?? null;
}

/** Cancelamento feito pelo próprio cliente com o código do agendamento. */
export async function cancelarAgendamento(token: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("nexa_cancelar_agendamento", {
    requested_token: token,
  });
  if (error) throw new Error("Não foi possível cancelar o agendamento.");
  return data === true;
}

/** Mensagem automática enviada ao WhatsApp do negócio após confirmar. */
export function mensagemAgendamento(
  site: Site,
  dados: { data: Date; hora: string; nome: string; telefone: string; servico?: string },
) {
  const partes = [
    `Novo agendamento pelo site ${site.conteudo.nome}`,
    `Cliente: ${dados.nome}`,
    dados.telefone ? `Telefone: ${dados.telefone}` : "",
    dados.servico ? `Serviço: ${dados.servico}` : "",
    `Data: ${dados.data.toLocaleDateString("pt-BR")} às ${dados.hora}`,
  ];
  return partes.filter(Boolean).join("\n");
}
