import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

/**
 * Remoção em duas etapas: o clique inicial pede confirmação explícita
 * antes de apagar o item. Nada é removido sem o segundo clique.
 */
export function BotaoRemover({
  onConfirmar,
  rotulo = "Remover",
  descricao = "Remover este item?",
}: {
  onConfirmar: () => void;
  rotulo?: string;
  descricao?: string;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const confirmarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirmando) confirmarRef.current?.focus();
  }, [confirmando]);

  if (!confirmando)
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 text-xs font-medium text-ember hover:bg-ember/10"
      >
        <Trash2 size={13} aria-hidden /> {rotulo}
      </button>
    );

  return (
    <div
      role="group"
      aria-label={descricao}
      className="flex flex-wrap items-center gap-2 rounded-xl border border-ember/40 bg-ember/5 p-2"
    >
      <span className="text-xs font-medium">{descricao}</span>
      <button
        ref={confirmarRef}
        type="button"
        onClick={() => {
          setConfirmando(false);
          onConfirmar();
        }}
        onKeyDown={(e) => e.key === "Escape" && setConfirmando(false)}
        className="min-h-9 rounded-full bg-ember px-3 text-xs font-semibold text-white"
      >
        Sim, remover
      </button>
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="min-h-9 rounded-full border border-border px-3 text-xs font-semibold"
      >
        Cancelar
      </button>
    </div>
  );
}
