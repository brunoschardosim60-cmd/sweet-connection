import { describe, expect, it } from "vitest";
import { lerClientesCsv, slugDoCliente } from "@/lib/nexa/clientes-csv";

describe("importação CSV de clientes", () => {
  it("lê colunas em português e aceita ponto e vírgula", () => {
    const resultado = lerClientesCsv(
      "Empresa;WhatsApp;Cidade;Estado;Segmento\nCafé do João;11999999999;São Paulo;SP;Alimentação",
    );
    expect(resultado.erros).toEqual([]);
    expect(resultado.clientes).toMatchObject([
      { empresa: "Café do João", telefone: "11999999999", segmento: "alimentacao" },
    ]);
  });

  it("relata linha sem empresa sem impedir as linhas válidas", () => {
    const resultado = lerClientesCsv("Empresa,Email\n,semnome@nexa.app\nNexa,nexa@nexa.app");
    expect(resultado.clientes).toHaveLength(1);
    expect(resultado.erros[0]).toContain("Linha 2");
  });

  it("gera um slug seguro", () => {
    expect(slugDoCliente(" Clínica São João! ")).toBe("clinica-sao-joao");
  });
});
