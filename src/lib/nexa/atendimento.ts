import type { Site } from "./types";

export const FUSOS = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Rio_Branco",
  "America/Noronha",
] as const;
export function fusoLoja(site: Site) {
  const fuso = site.comercio?.fusoHorario;
  return FUSOS.find((v) => v === fuso) ?? "America/Sao_Paulo";
}
export function horarioLocal(site: Site, instante: Date) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fusoLoja(site),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instante);
  const parte = (nome: string) => partes.find((p) => p.type === nome)?.value ?? "00";
  const dia = `${parte("year")}-${parte("month")}-${parte("day")}`;
  return {
    dia,
    indice: (new Date(`${dia}T12:00:00Z`).getUTCDay() + 6) % 7,
    minutos: Number(parte("hour")) * 60 + Number(parte("minute")),
  };
}
function minutos(valor: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(valor)) return null;
  const [hora = 0, minuto = 0] = valor.split(":").map(Number);
  return hora * 60 + minuto;
}
export function lojaAbertaEm(site: Site, instante = new Date()) {
  const horarios = site.conteudo.horarios ?? [];
  if (!horarios.length) return true;
  const local = horarioLocal(site, instante);
  const hoje = horarios[local.indice];
  const anterior = horarios[(local.indice + 6) % 7];
  for (const [turno, ontem] of [
    [hoje, false],
    [anterior, true],
  ] as const) {
    if (!turno || turno.fechado) continue;
    const de = minutos(turno.abre),
      ate = minutos(turno.fecha);
    if (de === null || ate === null || de === ate) continue;
    if (
      ontem
        ? de > ate && local.minutos < ate
        : de < ate
          ? local.minutos >= de && local.minutos < ate
          : local.minutos >= de
    )
      return true;
  }
  return false;
}
export function horariosPedido(site: Site, agora = new Date()) {
  if (site.comercio?.aceitarAgendamento === false || !site.conteudo.horarios?.length) return [];
  const inicio = Math.ceil((agora.getTime() + 30 * 60_000) / 1800_000) * 1800_000;
  const fim = agora.getTime() + 7 * 86400_000;
  const opcoes: { valor: string; rotulo: string }[] = [];
  const formato = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fusoLoja(site),
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  for (let tempo = inicio; tempo <= fim; tempo += 1800_000) {
    const instante = new Date(tempo);
    if (lojaAbertaEm(site, instante))
      opcoes.push({ valor: instante.toISOString(), rotulo: formato.format(instante) });
  }
  return opcoes;
}
export function rotuloAgendamento(site: Site, valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fusoLoja(site),
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valor));
}
