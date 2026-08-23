import { useEffect, useRef } from "react";

const SELETOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Acessibilidade dos modais/drawers: foco inicial dentro do diálogo, ciclo de
 * Tab preso ao conteúdo, Escape para fechar e retorno do foco ao elemento que
 * abriu. Também trava a rolagem do fundo no celular.
 */
export function useFocoModal(aberto: boolean, aoFechar: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  const aoFecharRef = useRef(aoFechar);

  // Os drawers recebem callbacks criados na renderização. Mantê-los em uma ref
  // evita reiniciar o efeito (e devolver o foco ao X) a cada tecla digitada.
  useEffect(() => {
    aoFecharRef.current = aoFechar;
  }, [aoFechar]);

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const foco = () => {
      const alvos = ref.current?.querySelectorAll<HTMLElement>(SELETOR);
      (alvos?.[0] ?? ref.current)?.focus();
    };
    const t = window.setTimeout(foco, 0);

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        aoFecharRef.current();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      const alvos = Array.from(ref.current.querySelectorAll<HTMLElement>(SELETOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (alvos.length === 0) return;
      const primeiro = alvos[0]!;
      const ultimo = alvos[alvos.length - 1]!;
      const ativo = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (ativo === primeiro || !ref.current.contains(ativo))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && ativo === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener("keydown", aoTeclar, true);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", aoTeclar, true);
      document.body.style.overflow = overflow;
      anterior?.focus?.();
    };
  }, [aberto]);

  return ref;
}
