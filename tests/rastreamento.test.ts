import { describe, expect, it } from "vitest";
import { idRastreador } from "@/lib/nexa/rastreamento";

describe("IDs de rastreamento", () => {
  it("aceita somente IDs públicos no formato de cada integração", () => {
    expect(idRastreador("ga", " G-ABC1234567 ")).toBe("G-ABC1234567");
    expect(idRastreador("gtm", "GTM-ABCD123")).toBe("GTM-ABCD123");
    expect(idRastreador("pixel", "123456789012345")).toBe("123456789012345");
    expect(idRastreador("ga", "GTM-ABCD123")).toBe("");
  });
  it.each(["ga", "gtm", "pixel"] as const)(
    "rejeita código, URLs e dados inválidos em %s",
    (tipo) => {
      for (const valor of [
        undefined,
        "",
        "https://example.com",
        "');alert(1);//",
        "<script>",
        "a".repeat(1000),
      ]) {
        expect(idRastreador(tipo, valor)).toBe("");
      }
    },
  );
});
