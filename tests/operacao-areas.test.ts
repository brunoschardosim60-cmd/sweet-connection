import { describe, it, expect } from "vitest";
import { abasDaOperacao, abaDisponivel } from "@/lib/nexa/operacao-areas";

const vazio = { pedidos: [], agenda: [], solicitacoes: [] };
describe("áreas de operação por loja", () => {
  it("cardápio mostra pedidos sem agenda ou formulário", () => {
    expect(
      abasDaOperacao(
        { ...vazio, recursosOperacao: { pedidos: true, agenda: false, solicitacoes: false } },
        true,
      ),
    ).toEqual(["Pedidos", "Estatísticas", "Equipe e acessos"]);
  });
  it("salão mostra agenda e solicitações sem pedidos", () => {
    expect(
      abasDaOperacao(
        { ...vazio, recursosOperacao: { pedidos: false, agenda: true, solicitacoes: true } },
        false,
      ),
    ).toEqual(["Agenda", "Solicitações", "Estatísticas"]);
  });
  it("preserva históricos de recursos desativados", () => {
    expect(
      abasDaOperacao(
        {
          pedidos: [{}],
          agenda: [{}],
          solicitacoes: [{}],
          recursosOperacao: { pedidos: false, agenda: false, solicitacoes: false },
        },
        false,
      ),
    ).toEqual(["Pedidos", "Agenda", "Solicitações", "Estatísticas"]);
  });
  it("loja institucional só mostra resultados e escolhe uma aba válida", () => {
    const abas = abasDaOperacao(
      { ...vazio, recursosOperacao: { pedidos: false, agenda: false, solicitacoes: false } },
      false,
    );
    expect(abas).toEqual(["Estatísticas"]);
    expect(abaDisponivel("Pedidos", abas)).toBe("Estatísticas");
    expect(abaDisponivel("Solicitações", ["Agenda", "Solicitações", "Estatísticas"])).toBe(
      "Solicitações",
    );
  });
  it("mantém compatibilidade enquanto o servidor antigo ainda não envia flags", () => {
    expect(abasDaOperacao(vazio, false)).toEqual([
      "Pedidos",
      "Agenda",
      "Solicitações",
      "Estatísticas",
    ]);
  });
});
