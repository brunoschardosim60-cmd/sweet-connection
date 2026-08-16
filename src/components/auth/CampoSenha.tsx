import { useState } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";

export const MIN_SENHA = 6;
export const ESPECIAIS = "!@#$%&*";

export const temEspecial = (v: string) => /[!@#$%&*]/.test(v);
export const senhaValida = (v: string) => v.length >= MIN_SENHA && temEspecial(v);

/** Campo de senha com mostrar/ocultar e requisitos visuais. */
export function CampoSenha({
  id,
  rotulo,
  valor,
  onChange,
  erro,
  autoComplete = "current-password",
  requisitos = false,
}: {
  id: string;
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  erro?: string;
  autoComplete?: string;
  requisitos?: boolean;
}) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {rotulo}
      </label>
      <div
        className={`flex items-center rounded-xl border bg-card pr-1.5 ${
          erro ? "border-ember" : "border-border focus-within:border-ink"
        }`}
      >
        <input
          id={id}
          type={visivel ? "text" : "password"}
          value={valor}
          autoComplete={autoComplete}
          aria-invalid={!!erro}
          aria-describedby={erro ? `${id}-erro` : requisitos ? `${id}-req` : undefined}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full bg-transparent px-3 text-sm outline-none"
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visivel}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
        >
          {visivel ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {erro && (
        <p id={`${id}-erro`} className="mt-1.5 text-xs text-ember">
          {erro}
        </p>
      )}
      {requisitos && (
        <ul id={`${id}-req`} className="mt-2 space-y-1 text-xs">
          <Requisito ok={valor.length >= MIN_SENHA} texto={`Pelo menos ${MIN_SENHA} caracteres`} />
          <Requisito ok={temEspecial(valor)} texto={`Um caractere especial (${ESPECIAIS})`} />
        </ul>
      )}
    </div>
  );
}

function Requisito({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <li className={`flex items-center gap-1.5 ${ok ? "text-foreground" : "text-muted-foreground"}`}>
      <span
        className={`grid h-4 w-4 place-items-center rounded-full ${
          ok ? "bg-lime text-ink" : "bg-secondary text-muted-foreground"
        }`}
        aria-hidden="true"
      >
        {ok ? <Check size={11} /> : <X size={11} />}
      </span>
      {texto}
      <span className="sr-only">{ok ? " — atendido" : " — pendente"}</span>
    </li>
  );
}
