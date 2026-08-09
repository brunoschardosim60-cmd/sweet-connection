export const slugify = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

export const uid = (prefixo = "id") =>
  `${prefixo}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;

export const moeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const numero = (valor: number) => valor.toLocaleString("pt-BR");

export const telefoneMask = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
      [a && `(${a}`, a.length === 2 ? ") " : "", b, c && `-${c}`].join(""),
    );
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
};

export const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export const tempoRelativo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.round(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
};

export const diasSemana = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

export function estaAberto(horarios: { dia: string; abre: string; fecha: string; fechado: boolean }[]) {
  const agora = new Date();
  const idx = (agora.getDay() + 6) % 7;
  const hoje = horarios[idx];
  if (!hoje || hoje.fechado) return false;
  const atual = agora.getHours() * 60 + agora.getMinutes();
  const toMin = (h: string) => {
    const [a = "0", b = "0"] = h.split(":");
    return Number(a) * 60 + Number(b);
  };
  return atual >= toMin(hoje.abre) && atual <= toMin(hoje.fecha);
}
