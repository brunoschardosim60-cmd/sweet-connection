import { describe, expect, it } from "vitest";
import { criarSite, presetsModelo } from "@/lib/nexa/factory";
import { modelos } from "@/lib/nexa/modelos";
import { telefoneWhatsApp } from "@/lib/nexa/telefone";

const cliente = {
  empresa: "Empresa Teste",
  segmento: "servicos" as const,
  responsavel: "Responsável",
  telefone: "(11) 99999-9999",
  email: "contato@example.com",
  cidade: "São Paulo",
  estado: "SP",
};

describe("presets funcionais dos modelos", () => {
  it("possui preset para todos os modelos disponíveis", () => {
    expect(Object.keys(presetsModelo).sort()).toEqual(modelos.map((modelo) => modelo.id).sort());
  });

  it("cria seções e formulário específicos para o modelo", () => {
    const restaurante = criarSite(cliente, "restaurante-moderno", "restaurante-teste");
    const clinica = criarSite(cliente, "odontologia", "clinica-teste");

    expect(restaurante.formulario.tipo).toBe("reserva");
    expect(restaurante.secoes.find((secao) => secao.tipo === "cardapio")?.ativa).toBe(true);
    expect(clinica.formulario.tipo).toBe("agendamento");
    expect(clinica.secoes.find((secao) => secao.tipo === "equipe")?.ativa).toBe(true);
  });

  it("usa somente dados reais do cliente no CTA inicial", () => {
    const site = criarSite(cliente, "petshop", "petshop-teste");
    expect(site.links).toHaveLength(1);
    expect(site.links[0]?.valor).toBe(cliente.telefone);
    expect(site.produtos).toEqual([]);
    expect(site.servicos).toEqual([]);
  });
});

describe("normalização de WhatsApp", () => {
  it("adiciona o DDI brasileiro somente quando necessário", () => {
    expect(telefoneWhatsApp("(11) 99999-9999")).toBe("5511999999999");
    expect(telefoneWhatsApp("5511999999999")).toBe("5511999999999");
  });
});
