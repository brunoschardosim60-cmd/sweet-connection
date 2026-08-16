/** Utilitários de exportação CSV usados no painel administrativo. */

export type ColunaCsv<T> = { cabecalho: string; valor: (item: T) => string | number | null | undefined };

/** Escapa um valor para CSV (aspas duplas, quebras de linha e ponto e vírgula). */
export function campoCsv(valor: string | number | null | undefined): string {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  const limpo = texto.replace(/\r?\n/g, " ").trim();
  return /[";,]/.test(limpo) ? `"${limpo.replace(/"/g, '""')}"` : limpo;
}

/** Monta o conteúdo CSV (separador ";", padrão pt-BR) a partir de colunas tipadas. */
export function montarCsv<T>(itens: T[], colunas: ColunaCsv<T>[]): string {
  const cabecalho = colunas.map((c) => campoCsv(c.cabecalho)).join(";");
  const linhas = itens.map((item) => colunas.map((c) => campoCsv(c.valor(item))).join(";"));
  return [cabecalho, ...linhas].join("\n");
}

export function nomeArquivoCsv(base: string, data = new Date()): string {
  return `${base}-${data.toISOString().slice(0, 10)}.csv`;
}

/** Dispara o download do CSV no navegador (BOM para o Excel ler acentos). */
export function baixarCsv(nome: string, conteudo: string) {
  if (typeof document === "undefined") return;
  const blob = new Blob([`\uFEFF${conteudo}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
