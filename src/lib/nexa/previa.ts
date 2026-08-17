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
  const largura = Math.min(disponivel.largura, dispositivo.largura, disponivel.altura * proporcao);
  return { largura, altura: largura / proporcao };
}

/** Valor CSS de largura equivalente ao cálculo acima (usa unidades de container). */
export function larguraCssPrevia(dispositivo: Caixa): string {
  const proporcao = dispositivo.largura / dispositivo.altura;
  return `min(100%, ${dispositivo.largura}px, calc(100cqh * ${proporcao}))`;
}

/** Fator de escala para caber o dispositivo inteiro no espaço disponível (nunca amplia). */
export function escalaPrevia(disponivel: Caixa, dispositivo: Caixa): number {
  if (disponivel.largura <= 0 || disponivel.altura <= 0) return 1;
  return Math.min(
    1,
    disponivel.largura / dispositivo.largura,
    disponivel.altura / dispositivo.altura,
  );
}

/** Inverte largura e altura (orientação horizontal). */
export function deitar(caixa: Caixa): Caixa {
  return { largura: caixa.altura, altura: caixa.largura };
}

/** Área segura simulada (notch / barra inferior) de cada dispositivo, em px. */
export const areaSegura = {
  celular: { topo: 44, base: 34, lado: 0 },
  tablet: { topo: 24, base: 20, lado: 0 },
} as const;

/** Padding CSS de área segura conforme a orientação. */
export function paddingAreaSegura(
  tipo: keyof typeof areaSegura,
  horizontal: boolean,
): { paddingTop: number; paddingBottom: number; paddingLeft: number; paddingRight: number } {
  const a = areaSegura[tipo];
  if (horizontal) {
    return { paddingTop: a.lado, paddingBottom: a.lado, paddingLeft: a.topo, paddingRight: a.base };
  }
  return { paddingTop: a.topo, paddingBottom: a.base, paddingLeft: a.lado, paddingRight: a.lado };
}
