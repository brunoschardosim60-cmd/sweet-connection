/** Dimensões de referência de cada dispositivo usado nas prévias. */
export const dimensoesDispositivo = {
  celular: { largura: 390, altura: 844 },
  tablet: { largura: 768, altura: 1024 },
  computador: null,
} as const;

export type DispositivoPrevia = keyof typeof dimensoesDispositivo;

export interface Caixa {
  largura: number;
  altura: number;
}

/**
 * Calcula o tamanho real da moldura de prévia para caber inteira no espaço
 * disponível, mantendo a proporção do dispositivo (sem cortar conteúdo).
 */
export function calcularPrevia(disponivel: Caixa, dispositivo: Caixa): Caixa {
  const proporcao = dispositivo.largura / dispositivo.altura;
  const largura = Math.min(
    disponivel.largura,
    dispositivo.largura,
    disponivel.altura * proporcao,
  );
  return { largura, altura: largura / proporcao };
}

/** Valor CSS de largura equivalente ao cálculo acima (usa unidades de container). */
export function larguraCssPrevia(dispositivo: Caixa): string {
  const proporcao = dispositivo.largura / dispositivo.altura;
  return `min(100%, ${dispositivo.largura}px, calc(100cqh * ${proporcao}))`;
}
