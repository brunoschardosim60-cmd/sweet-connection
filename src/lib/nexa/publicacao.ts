/** Regras de validade da publicação, isoladas para a UI não divergir do banco. */
export function expiraEmDias(dias: number, agora = new Date()): string {
  const data = new Date(agora);
  data.setDate(data.getDate() + dias);
  data.setHours(23, 59, 59, 999);
  return data.toISOString();
}

export function dataParaExpiracao(data: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
  const fimDoDia = new Date(`${data}T23:59:59.999`);
  return Number.isNaN(fimDoDia.getTime()) ? null : fimDoDia.toISOString();
}

export function dataDoCampo(expiraEm?: string | null): string {
  if (!expiraEm) return "";
  const data = new Date(expiraEm);
  if (Number.isNaN(data.getTime())) return "";
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function siteExpirado(expiraEm?: string | null, agora = Date.now()): boolean {
  if (!expiraEm) return false;
  const limite = new Date(expiraEm).getTime();
  return !Number.isFinite(limite) || limite <= agora;
}

export function textoDaExpiracao(expiraEm?: string | null): string {
  if (!expiraEm) return "Sem data para expirar";
  const data = new Date(expiraEm);
  if (Number.isNaN(data.getTime())) return "Data de expiração inválida";
  return `Até ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(data)}`;
}
