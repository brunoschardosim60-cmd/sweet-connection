import { describe, expect, it } from "vitest";
import { criarSiteModeloPronto } from "@/lib/nexa/modelo-pronto";
import { criarSite } from "@/lib/nexa/factory";
import { siteDoModelo } from "@/lib/nexa/demo-modelos";
import { modelos } from "@/lib/nexa/modelos";
import type { Cliente } from "@/lib/nexa/types";

const cliente: Cliente = {
  empresa: "Meu negócio",
  segmento: "alimentacao",
  responsavel: "Responsável",
  telefone: "(48) 99999-1234",
  email: "loja@example.com",
  cidade: "Florianópolis",
  estado: "SC",
};

describe("usar modelo pronto", () => {
  it("mantém os IDs da prévia estáveis ao editar os dados e hidratar a página", () => {
    const a = criarSiteModeloPronto(cliente, "cardapio-hamburgueria", "previa", true);
    const b = criarSiteModeloPronto(
      { ...cliente, empresa: "Novo nome" },
      "cardapio-hamburgueria",
      "previa",
      true,
    );
    expect(a.id).toBe(b.id);
    expect(a.produtos.map((p) => p.id)).toEqual(b.produtos.map((p) => p.id));
    expect(a.formulario.campos.map((c) => c.id)).toEqual(b.formulario.campos.map((c) => c.id));
  });
  it.each(modelos.map((modelo) => modelo.id))(
    "preenche %s sem herdar identidade ou privilégios",
    (id) => {
      const site = criarSiteModeloPronto(cliente, id, "meu-negocio");
      const demo = siteDoModelo(id);
      expect(site.id).not.toBe(demo.id);
      expect(site.slug).toBe("meu-negocio");
      expect(site.status).toBe("rascunho");
      expect(site.expiraEm).toBeNull();
      expect(site.cliente).toEqual(cliente);
      expect(site.conteudo.nome).toBe(cliente.empresa);
      expect(site.conteudo.whatsapp).toBe(cliente.telefone);
      expect(site.conteudo.email).toBe(cliente.email);
      expect(site.conteudo.instagram).toBe("");
      expect(site.conteudo.endereco).toBe("Florianópolis - SC");
      expect(site.conteudo.descricao).not.toBe("");
      expect(site.aparencia).toEqual(demo.aparencia);
      expect(site.produtos).toHaveLength(demo.produtos.length);
      expect(site.servicos).toHaveLength(demo.servicos.length);
      expect(site.galeria).toHaveLength(demo.galeria.length);
      expect(site.metricas.visitas).toBe(0);
      expect(site.metricas.serie).toEqual([]);
      expect(Object.values(site.integracoes).every((valor) => valor === "")).toBe(true);
      expect(site.links.every((link) => link.valor === cliente.telefone)).toBe(true);
      expect(site.depoimentos).toEqual([]);
      expect(site.equipe).toEqual([]);
      expect(site.cupons).toEqual([]);
      expect(
        site.secoes
          .filter((secao) =>
            ["depoimentos", "equipe", "cupom", "promocao", "videos", "livre"].includes(secao.tipo),
          )
          .every((secao) => !secao.ativa),
      ).toBe(true);
    },
  );

  it("cada cópia e personalização pode ser editada sem alterar os modelos ou outra cópia", () => {
    const id = "cardapio-hamburgueria";
    const a = criarSiteModeloPronto(cliente, id, "loja-a");
    const b = criarSiteModeloPronto(cliente, id, "loja-b");
    const original = siteDoModelo(id).produtos[0]!.nome;
    a.produtos[0]!.nome = "Meu hambúrguer";
    a.aparencia.corPrimaria = "#123456";
    expect(b.produtos[0]!.nome).toBe(original);
    expect(siteDoModelo(id).produtos[0]!.nome).toBe(original);
    expect(a.produtos[0]!.id).not.toBe(b.produtos[0]!.id);
    expect(a.produtos[0]!.personalizacoes?.[0]?.id).not.toBe(
      b.produtos[0]!.personalizacoes?.[0]?.id,
    );
    expect(b.aparencia.corPrimaria).not.toBe("#123456");
  });

  it("mantém a alternativa só visual e o modelo personalizado em branco", () => {
    const visual = criarSite(cliente, "cardapio-hamburgueria", "so-visual");
    const vazio = criarSiteModeloPronto(cliente, "personalizado", "do-zero");
    expect(visual.produtos).toEqual([]);
    expect(visual.servicos).toEqual([]);
    expect(vazio.produtos).toEqual([]);
    expect(vazio.servicos).toEqual([]);
    expect(vazio.conteudo.descricao).toBe("");
  });
});
