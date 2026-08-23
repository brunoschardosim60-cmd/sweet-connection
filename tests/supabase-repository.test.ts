import { describe, expect, it } from "vitest";
import { mensagemErro } from "@/lib/nexa/supabase-repository";

describe("mensagemErro", () => {
  it("encontra erros de plano mesmo quando o banco os devolve em details ou hint", () => {
    expect(mensagemErro({ message: "erro RPC", details: "subscription_required" })).toBe(
      "Ative um plano para publicar este mini-site.",
    );
    expect(mensagemErro({ message: "erro RPC", hint: "catalog_feature_required" })).toBe(
      "Cardápio, cupons e promoções exigem o plano Catálogo.",
    );
    expect(mensagemErro({ message: "erro RPC", details: "professional_feature_required" })).toBe(
      "Serviços, agenda, portfólio e depoimentos exigem o plano Profissional.",
    );
  });

  it("explica limites e datas inválidas sem exibir o identificador interno do banco", () => {
    expect(mensagemErro({ message: "minisite_creation_limit_reached" })).toBe(
      "Você atingiu o limite de projetos do seu plano.",
    );
    expect(mensagemErro({ message: "erro RPC", details: "published_site_limit_reached" })).toBe(
      "Você atingiu o limite de mini-sites publicados do seu plano.",
    );
    expect(mensagemErro({ message: "erro RPC", hint: "expiry_must_be_in_the_future" })).toBe(
      "Escolha uma data de expiração futura para publicar este mini-site.",
    );
  });

  it("preserva mensagens desconhecidas para não esconder um erro novo", () => {
    expect(mensagemErro({ message: "Falha temporária no servidor." })).toBe(
      "Falha temporária no servidor.",
    );
  });
});
