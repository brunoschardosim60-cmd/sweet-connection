import type { Aparencia } from "./types";

/** Presets de cores/tipografia aplicáveis em um clique na aba Aparência. */
export interface PaletaPronta {
  id: string;
  nome: string;
  descricao: string;
  valores: Pick<
    Aparencia,
    "corPrimaria" | "corFundo" | "corTexto" | "tema" | "fonte" | "botao" | "raio"
  >;
}

export const paletasProntas: PaletaPronta[] = [
  {
    id: "nox-dark-gold",
    nome: "Nox / Dark Gold",
    descricao: "Fundo escuro com dourado — bares, barbearias e restaurantes.",
    valores: {
      corPrimaria: "#e2b866",
      corFundo: "#111110",
      corTexto: "#f5f1e8",
      tema: "escuro",
      fonte: "moderna",
      botao: "solido",
      raio: 16,
    },
  },
  {
    id: "clean-pastel",
    nome: "Clean Pastel",
    descricao: "Claro e suave — ateliês, moda e estética.",
    valores: {
      corPrimaria: "#c2705a",
      corFundo: "#fbf7f3",
      corTexto: "#2a231f",
      tema: "claro",
      fonte: "elegante",
      botao: "suave",
      raio: 20,
    },
  },
  {
    id: "neon-night",
    nome: "Neon Night",
    descricao: "Alto contraste com verde neon — hamburguerias e eventos.",
    valores: {
      corPrimaria: "#b6ff3c",
      corFundo: "#0b0d10",
      corTexto: "#eef2f0",
      tema: "escuro",
      fonte: "tecnica",
      botao: "pill",
      raio: 999,
    },
  },
  {
    id: "cafe-areia",
    nome: "Café & Areia",
    descricao: "Tons terrosos e acolhedores — cafeterias e docerias.",
    valores: {
      corPrimaria: "#8a5a3b",
      corFundo: "#f6efe6",
      corTexto: "#31251c",
      tema: "claro",
      fonte: "editorial",
      botao: "solido",
      raio: 14,
    },
  },
  {
    id: "verde-menta",
    nome: "Verde Menta",
    descricao: "Fresco e saudável — clínicas, pet shops e bem-estar.",
    valores: {
      corPrimaria: "#1f9d76",
      corFundo: "#f4fbf8",
      corTexto: "#12241d",
      tema: "claro",
      fonte: "moderna",
      botao: "contorno",
      raio: 18,
    },
  },
  {
    id: "mono-minimal",
    nome: "Mono Minimal",
    descricao: "Preto no branco — advocacia, consultoria e serviços técnicos.",
    valores: {
      corPrimaria: "#111111",
      corFundo: "#ffffff",
      corTexto: "#121212",
      tema: "claro",
      fonte: "moderna",
      botao: "contorno",
      raio: 8,
    },
  },
  {
    id: "azul-corporativo",
    nome: "Azul Corporativo",
    descricao: "Confiança e clareza — transporte, imóveis e B2B.",
    valores: {
      corPrimaria: "#1d5fd6",
      corFundo: "#f5f7fb",
      corTexto: "#101828",
      tema: "claro",
      fonte: "moderna",
      botao: "solido",
      raio: 12,
    },
  },
  {
    id: "rosa-atelie",
    nome: "Rosa Ateliê",
    descricao: "Delicado e feminino — salões, docerias e joalherias.",
    valores: {
      corPrimaria: "#c4536f",
      corFundo: "#fff7f8",
      corTexto: "#2c1a20",
      tema: "claro",
      fonte: "elegante",
      botao: "suave",
      raio: 22,
    },
  },
];
