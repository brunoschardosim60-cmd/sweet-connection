import { describe, expect, it } from "vitest";
import {
  FORMAS_PAGAMENTO_CHECKOUT,
  cicloCobranca,
  descontoBoasVindas,
  idDaReferencia,
  planoPago,
  proximoVencimento,
  referenciaCheckout,
  statusAssinaturaAsaas,
} from "../src/lib/nexa/asaas.server";

describe("integração Asaas", () => {
  it("oferece Pix e cartão no checkout", () => {
    expect(FORMAS_PAGAMENTO_CHECKOUT).toEqual(["PIX", "CREDIT_CARD"]);
  });

  it("aplica R$ 34 de desconto somente no primeiro mês do Essencial", () => {
    expect(descontoBoasVindas("essential", true, "2026-08-21 12:00:00")).toEqual({
      value: 34,
      type: "FIXED",
      dueDateLimitDays: 0,
      limitDate: "2026-08-21",
    });
    expect(descontoBoasVindas("essential", false, "2026-08-21 12:00:00")).toBeUndefined();
    expect(descontoBoasVindas("professional", true, "2026-08-21 12:00:00")).toBeUndefined();
  });

  it("aceita somente planos comercializáveis", () => {
    expect(planoPago("essential")).toBe("essential");
    expect(planoPago("professional")).toBe("professional");
    expect(planoPago("catalog")).toBe("catalog");
    expect(planoPago("none")).toBeNull();
  });

  it("aceita somente os ciclos mensal e anual", () => {
    expect(cicloCobranca("monthly")).toBe("monthly");
    expect(cicloCobranca("annual")).toBe("annual");
    expect(cicloCobranca("yearly")).toBeNull();
  });

  it("não extrai referências que não foram emitidas pela Nexa", () => {
    const id = "c4f9a31d-1e50-4cc8-9a93-291bb1fbe15d";
    expect(idDaReferencia(referenciaCheckout(id))).toBe(id);
    expect(idDaReferencia("owner:qualquer-usuario:catalog")).toBeNull();
  });

  it("só ativa plano depois de pagamento confirmado ou recebido", () => {
    expect(statusAssinaturaAsaas("PENDING")).toBeNull();
    expect(statusAssinaturaAsaas("RECEIVED")).toBe("active");
    expect(statusAssinaturaAsaas("CONFIRMED")).toBe("active");
    expect(statusAssinaturaAsaas("OVERDUE")).toBe("past_due");
  });

  it("envia a data de assinatura no formato exigido pelo checkout", () => {
    expect(proximoVencimento()).toMatch(/^\d{4}-\d{2}-\d{2} 12:00:00$/);
  });
});
