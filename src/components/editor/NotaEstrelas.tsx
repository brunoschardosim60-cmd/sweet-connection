import { Star } from "lucide-react";

type NotaEstrelasProps = {
  nota: number;
  nomeGrupo: string;
  onChange: (nota: number) => void;
};

/**
 * Seletor de nota com rádios nativos. O navegador fornece um único ponto de Tab
 * e navegação por setas entre as estrelas do mesmo grupo.
 */
export function NotaEstrelas({ nota, nomeGrupo, onChange }: NotaEstrelasProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Nota do depoimento"
      className="flex flex-wrap items-center gap-1"
    >
      {[1, 2, 3, 4, 5].map((valor) => (
        <label
          key={valor}
          className="grid h-11 w-11 cursor-pointer place-items-center rounded-lg hover:bg-secondary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2"
        >
          <input
            type="radio"
            name={nomeGrupo}
            value={valor}
            checked={nota === valor}
            aria-label={`${valor} estrela${valor > 1 ? "s" : ""}`}
            onChange={() => onChange(valor)}
            className="sr-only"
          />
          <Star
            size={18}
            aria-hidden="true"
            className={valor <= nota ? "fill-lime text-lime" : "text-muted-foreground"}
          />
        </label>
      ))}
      <span className="ml-1 text-xs text-muted-foreground" aria-live="polite">
        {nota} de 5 estrela{nota > 1 ? "s" : ""}
      </span>
    </div>
  );
}
