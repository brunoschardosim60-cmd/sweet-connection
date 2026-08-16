import { describe, expect, it } from "vitest";
import { campoCsv, montarCsv, nomeArquivoCsv } from "@/lib/nexa/csv";

describe("csv", () => {
  it("escapa separadores, aspas e quebras de linha", () => {
    expect(campoCsv("simples")).toBe("simples");
    expect(campoCsv("com;ponto e vírgula")).toBe('"com;ponto e vírgula"');
    expect(campoCsv('aspas "internas"')).toBe('"aspas ""internas"""');
    expect(campoCsv("linha1\nlinha2")).toBe("linha1 linha2");
    expect(campoCsv(null)).toBe("");
    expect(campoCsv(0)).toBe("0");
  });

  it("monta o CSV com cabeçalho e colunas na ordem informada", () => {
    const csv = montarCsv(
      [
        { email: "a@nexa.com", sites: 2 },
        { email: "b;x@nexa.com", sites: 0 },
      ],
      [
        { cabecalho: "E-mail", valor: (u) => u.email },
        { cabecalho: "Sites", valor: (u) => u.sites },
      ],
    );

    expect(csv.split("\n")).toEqual([
      "E-mail;Sites",
      "a@nexa.com;2",
      '"b;x@nexa.com";0',
    ]);
  });

  it("gera nome de arquivo com a data", () => {
    expect(nomeArquivoCsv("usuarios-nexa", new Date("2026-08-16T12:00:00Z"))).toBe(
      "usuarios-nexa-2026-08-16.csv",
    );
  });
});
