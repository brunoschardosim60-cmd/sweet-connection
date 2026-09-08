import {
  taxaEntrega,
  totaisCarrinho,
  whatsappValido,
  type Entrega,
  type ItemCarrinho,
  type Pagamento,
} from "./catalogo";
import type { Site } from "./types";
export interface CamposEntrega {
  nome: string;
  whatsapp: string;
  horarioPreferido: string;
  mesa: string;
  pessoas: string;
  endereco: string;
  bairro: string;
  complemento: string;
  referencia: string;
  observacao: string;
  troco: string;
}
export function taxaConhecida(site: Site, modalidade: Entrega, bairro = "") {
  if (modalidade !== "entrega") return true;
  if (
    site.comercio?.taxasPorBairro?.some(
      (t) =>
        t.bairro.trim().toLocaleLowerCase("pt-BR") === bairro.trim().toLocaleLowerCase("pt-BR"),
    )
  )
    return true;
  return (
    site.comercio?.taxaEntregaDefinida !== false && typeof site.comercio?.taxaEntrega === "number"
  );
}
export function rotuloTaxa(site: Site, modalidade: Entrega, bairro = "") {
  if (modalidade !== "entrega") return "Sem taxa de entrega";
  if (!taxaConhecida(site, modalidade, bairro)) return "Taxa ainda não definida";
  return taxaEntrega(site, bairro) === 0 ? "Entrega grátis" : "Taxa de entrega";
}
export function erroEtapaCheckout(
  etapa: number,
  site: Site,
  itens: ItemCarrinho[],
  modalidade: Entrega,
  dados: CamposEntrega,
  pagamento?: Pagamento,
) {
  if (!itens.length) return "Adicione um item ao pedido.";
  if (itens.some((i) => i.erro)) return "Revise as personalizações dos itens.";
  if (itens.some((i) => !Number.isInteger(i.quantidade) || i.quantidade < 1 || i.quantidade > 30))
    return "Revise as quantidades.";
  const totais = totaisCarrinho(itens, site, modalidade, dados.bairro);
  if (totais.abaixoDoMinimo) return "Adicione mais itens para atingir o pedido mínimo.";
  if (!taxaConhecida(site, modalidade, dados.bairro))
    return "A taxa de entrega ainda não foi definida. Consulte o estabelecimento ou escolha outra modalidade.";
  if (etapa >= 1) {
    if (dados.nome.trim().length < 2) return "Informe seu nome.";
    if (!whatsappValido(dados.whatsapp)) return "Informe um WhatsApp válido com DDD.";
    if (modalidade === "entrega" && dados.endereco.trim().length < 5)
      return "Informe a rua e o número para a entrega.";
    if (modalidade === "mesa" && !/^[1-9]\d*$/.test(dados.mesa)) return "Informe o número da mesa.";
  }
  if (
    etapa >= 2 &&
    (!pagamento ||
      (site.comercio?.pagamentosAceitos?.length &&
        !site.comercio.pagamentosAceitos.includes(pagamento)))
  )
    return "Escolha uma forma de pagamento aceita.";
  return "";
}
