import restaurante from "@/assets/seg-restaurante.jpg";
import hamburgueria from "@/assets/seg-hamburgueria.jpg";
import moda from "@/assets/seg-moda.jpg";
import cosmeticos from "@/assets/seg-cosmeticos.jpg";
import barbearia from "@/assets/seg-barbearia.jpg";
import salao from "@/assets/seg-salao.jpg";
import clinica from "@/assets/seg-clinica.jpg";
import fitness from "@/assets/seg-fitness.jpg";
import fotografo from "@/assets/seg-fotografo.jpg";
import imoveis from "@/assets/seg-imoveis.jpg";
import transporte from "@/assets/seg-transporte.jpg";
import servicos from "@/assets/seg-servicos.jpg";
import advocacia from "@/assets/seg-advocacia.jpg";

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
