import restaurante from "@/assets/seg-restaurante.webp";
import hamburgueria from "@/assets/seg-hamburgueria.webp";
import moda from "@/assets/seg-moda.webp";
import cosmeticos from "@/assets/seg-cosmeticos.webp";
import barbearia from "@/assets/seg-barbearia.webp";
import salao from "@/assets/seg-salao.webp";
import clinica from "@/assets/seg-clinica.webp";
import fitness from "@/assets/seg-fitness.webp";
import fotografo from "@/assets/seg-fotografo.webp";
import imoveis from "@/assets/seg-imoveis.webp";
import transporte from "@/assets/seg-transporte.webp";
import servicos from "@/assets/seg-servicos.webp";
import advocacia from "@/assets/seg-advocacia.webp";
import petshop from "@/assets/seg-petshop.webp";
import odontologia from "@/assets/seg-odontologia.webp";
import mecanica from "@/assets/seg-mecanica.webp";
import pizzaria from "@/assets/seg-pizzaria.webp";
import doceria from "@/assets/seg-doceria.webp";
import eventos from "@/assets/seg-eventos.webp";
import academia from "@/assets/seg-academia.webp";
import tattoo from "@/assets/seg-tattoo.webp";
import construcao from "@/assets/seg-construcao.webp";
import pousada from "@/assets/seg-pousada.webp";
import bar from "@/assets/seg-bar.webp";
import cafeteria from "@/assets/seg-cafeteria.webp";
import acai from "@/assets/seg-acai.webp";
import marmita from "@/assets/seg-marmita.webp";
import nutricao from "@/assets/seg-nutricao.jpg";
import psicologia from "@/assets/seg-psicologia.jpg";
import spa from "@/assets/seg-spa.jpg";
import nail from "@/assets/seg-nail.jpg";
import idiomas from "@/assets/seg-idiomas.jpg";
import autoescola from "@/assets/seg-autoescola.jpg";
import contabilidade from "@/assets/seg-contabilidade.jpg";
import agencia from "@/assets/seg-agencia.jpg";
import floricultura from "@/assets/seg-floricultura.jpg";
import assistencia from "@/assets/seg-assistencia.jpg";
import automotiva from "@/assets/seg-automotiva.jpg";
import turismo from "@/assets/seg-turismo.jpg";

export const imagens = {
  restaurante,
  hamburgueria,
  moda,
  cosmeticos,
  barbearia,
  salao,
  clinica,
  fitness,
  fotografo,
  imoveis,
  transporte,
  servicos,
  advocacia,
  petshop,
  odontologia,
  mecanica,
  pizzaria,
  doceria,
  eventos,
  academia,
  tattoo,
  construcao,
  pousada,
  bar,
  cafeteria,
  acai,
  marmita,
  nutricao,
  psicologia,
  spa,
  nail,
  idiomas,
  autoescola,
  contabilidade,
  agencia,
  floricultura,
  assistencia,
  automotiva,
  turismo,
} as const;

export type ImagemKey = keyof typeof imagens;

/** Biblioteca de mídias simulada usada no painel e no editor. */
export const biblioteca: { id: ImagemKey; nome: string; url: string }[] = (
  Object.keys(imagens) as ImagemKey[]
).map((id) => ({
  id,
  nome: id.charAt(0).toUpperCase() + id.slice(1),
  url: imagens[id],
}));
