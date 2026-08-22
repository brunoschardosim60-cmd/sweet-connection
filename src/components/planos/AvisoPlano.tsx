import { Link } from "@tanstack/react-router";
import { Crown, Lock, Sparkles, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

export type MotivoBloqueio = "sem-plano" | "limite-sites" | "sem-ia";

const conteudo: Record<
  MotivoBloqueio,
  { icone: ReactNode; titulo: string; texto: string; acao: string }
> = {
  "sem-plano": {
    icone: <Lock size={18} aria-hidden="true" />,
    titulo: "Publicação bloqueada",
    texto:
      "Sua conta pode manter 1 rascunho, mas a publicação exige um plano ativo. Escolha um plano para colocar o mini-site no ar.",
    acao: "Escolher plano",
  },
  "limite-sites": {
    icone: <TriangleAlert size={18} aria-hidden="true" />,
    titulo: "Limite de mini-sites atingido",
    texto:
      "Você já usou todos os mini-sites incluídos no seu plano atual. Faça upgrade para liberar mais projetos.",
    acao: "Fazer upgrade",
  },
  "sem-ia": {
    icone: <Sparkles size={18} aria-hidden="true" />,
    titulo: "Criação com IA indisponível",
    texto:
      "A montagem automática com IA está incluída nos planos Profissional e Catálogo. Escolha um deles para gerar seções e textos automaticamente.",
    acao: "Ver planos",
  },
};

/**
 * Aviso visual de bloqueio/upgrade. Puramente apresentacional: não valida nada,
 * apenas orienta a pessoa até a página de planos quando a plataforma informa o bloqueio.
 */
export function AvisoPlano({
  motivo,
  mensagem,
  className = "",
}: {
  motivo: MotivoBloqueio;
  /** Mensagem real vinda da plataforma, quando houver. */
  mensagem?: string | null;
  className?: string;
}) {
  const c = conteudo[motivo];
  return (
    <aside
      role="note"
      className={`overflow-hidden rounded-2xl border border-border bg-card ${className}`}
    >
      <div className="flex items-start gap-3 border-l-4 border-ink p-4 sm:p-5">
        <span
          className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-foreground"
          aria-hidden="true"
        >
          {c.icone}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{c.titulo}</p>
          <p className="mt-1 text-sm text-muted-foreground">{mensagem?.trim() || c.texto}</p>
          <Link
            to="/painel/meu-plano"
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-ink-foreground transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <Crown size={15} aria-hidden="true" /> {c.acao}
          </Link>
        </div>
      </div>
    </aside>
  );
}

export default AvisoPlano;
