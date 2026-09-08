import { describe, expect, it } from "vitest";
import { buscaAuth, destinoAutenticacao, retornoSeguro } from "@/lib/nexa/auth-retorno";
import { buscaGaleria } from "@/lib/nexa/galeria-busca";

describe("continuidade da escolha do modelo", () => {
  it("não sobrescreve o destino durante a transição para login/cadastro", () => {
    expect(destinoAutenticacao("/painel/novo", "?modelo=cardapio-doceria")).toBe(
      "/painel/novo?modelo=cardapio-doceria",
    );
    expect(destinoAutenticacao("/login", "?retorno=%2Fpainel%2Fnovo")).toBeUndefined();
    expect(destinoAutenticacao("/cadastro")).toBeUndefined();
  });
  it("preserva modelo e modo durante autenticação", () => {
    const destino = "/painel/novo?modelo=cardapio-doceria&modo=ia";
    expect(buscaAuth({ retorno: destino })).toEqual({ retorno: destino });
    expect(retornoSeguro(buscaAuth({ retorno: destino }).retorno)).toBe(destino);
  });
  it.each([
    undefined,
    null,
    123,
    "https://evil.example",
    "//evil.example",
    "/painel-malicioso",
    "/painel/../../login",
    "/painel/\\evil",
    "/painel\n",
    "/login",
    "javascript:alert(1)",
  ])("rejeita destino externo ou inválido: %s", (destino) => {
    expect(retornoSeguro(destino)).toBe("/painel");
  });
  it("valida o tipo da galeria sem exigir parâmetros em links existentes", () => {
    expect(buscaAuth({})).toEqual({});
    expect(buscaGaleria({})).toEqual({});
    expect(buscaGaleria({ tipo: "inexistente" })).toEqual({});
    for (const tipo of ["cardapio", "minisite", "ia"])
      expect(buscaGaleria({ tipo })).toEqual({ tipo });
  });
});
