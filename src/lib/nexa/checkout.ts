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
  agendadoPara?: string;
}
export interface CotacaoEntrega {
  id: string;
  taxa: number;
  distanciaKm: number;
  expiraEm: string;
}
export function usaEntregaPorDistancia(site: Site) {
  return site.comercio?.calculoEntrega === "distancia";
}
export function taxaConhecida(
  site: Site,
  modalidade: Entrega,
  bairro = "",
  cotacao?: CotacaoEntrega | null,
) {
  if (modalidade !== "entrega") return true;
  if (usaEntregaPorDistancia(site)) return Boolean(cotacao);
  if (
    site.comercio?.calculoEntrega === "bairro" &&
    !site.comercio.taxasPorBairro?.some(
      (t) =>
        t.bairro.trim().toLocaleLowerCase("pt-BR") === bairro.trim().toLocaleLowerCase("pt-BR"),
    )
  )
    return false;
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
export function rotuloTaxa(
  site: Site,
  modalidade: Entrega,
  bairro = "",
  cotacao?: CotacaoEntrega | null,
) {
  if (modalidade !== "entrega") return "Sem taxa de entrega";
  if (!taxaConhecida(site, modalidade, bairro, cotacao)) return "Taxa ainda não calculada";
  const valor = cotacao?.taxa ?? taxaEntrega(site, bairro);
  return valor === 0 ? "Entrega grátis" : "Taxa de entrega";
}
export function erroEtapaCheckout(
  etapa: number,
  site: Site,
  itens: ItemCarrinho[],
  modalidade: Entrega,
  dados: CamposEntrega,
  pagamento?: Pagamento,
  cotacao?: CotacaoEntrega | null,
  agendamentoObrigatorio = false,
) {
  if (!itens.length) return "Adicione um item ao pedido.";
  if (itens.some((i) => i.erro)) return "Revise as personalizações dos itens.";
  if (itens.some((i) => !Number.isInteger(i.quantidade) || i.quantidade < 1 || i.quantidade > 30))
    return "Revise as quantidades.";
  const totais = totaisCarrinho(itens, site, modalidade, dados.bairro, cotacao?.taxa);
  if (totais.abaixoDoMinimo) return "Adicione mais itens para atingir o pedido mínimo.";
  if (!taxaConhecida(site, modalidade, dados.bairro, cotacao))
    return usaEntregaPorDistancia(site)
      ? "Calcule a entrega pelo endereço antes de continuar."
      : "A taxa de entrega ainda não foi definida. Consulte o estabelecimento ou escolha outra modalidade.";
  if (agendamentoObrigatorio && !dados.agendadoPara)
    return "A loja está fechada. Escolha um horário para agendar o pedido.";
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
