import { describe, expect, it } from "vitest";
import { dataDoCampo, dataParaExpiracao, expiraEmDias, siteExpirado } from "@/lib/nexa/publicacao";

describe("validade de publicação", () => {
  it("não expira um mini-site marcado para sempre", () => {
    expect(siteExpirado(null)).toBe(false);
    expect(siteExpirado(undefined)).toBe(false);
  });

  it("calcula prazos até o fim do dia", () => {
    const prazo = expiraEmDias(365, new Date("2026-08-20T10:30:00-03:00"));
    expect(dataDoCampo(prazo)).toBe("2027-08-20");
    expect(siteExpirado(prazo, new Date("2026-08-21T00:00:00-03:00").getTime())).toBe(false);
  });

  it("converte a data escolhida pelo usuário para o fim do dia", () => {
    const prazo = dataParaExpiracao("2026-12-31");
    expect(prazo).not.toBeNull();
    expect(siteExpirado(prazo, new Date("2027-01-01T00:00:00").getTime())).toBe(true);
  });

  it("considera vencido um prazo passado ou inválido", () => {
    expect(siteExpirado("2020-01-01T00:00:00.000Z")).toBe(true);
    expect(siteExpirado("data-inválida")).toBe(true);
  });
});
