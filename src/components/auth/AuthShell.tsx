import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

/** Moldura visual compartilhada pelas telas de acesso (login, cadastro, senha). */
export function AuthShell({
  titulo,
  subtitulo,
  children,
  rodape,
}: {
  titulo: string;
  subtitulo: string;
  children: ReactNode;
  rodape?: ReactNode;
}) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="inline-flex" aria-label="Voltar para a página inicial">
            <Logo />
          </Link>
          <h1 className="mt-8 font-display text-3xl font-bold tracking-tight">{titulo}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitulo}</p>
          <div className="mt-7">{children}</div>
          {rodape && <div className="mt-6 text-sm text-muted-foreground">{rodape}</div>}
        </div>
      </section>

      <aside className="relative hidden overflow-hidden bg-ink p-10 text-ink-foreground lg:flex lg:flex-col lg:justify-end">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-lime/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-ember/20 blur-3xl" />
        <blockquote className="relative max-w-sm">
          <p className="font-display text-2xl font-semibold leading-snug">
            Mini-sites profissionais para pequenos negócios, criados em minutos.
          </p>
          <p className="mt-3 text-sm text-ink-foreground/70">
            Modelos por segmento, editor visual e link pronto para compartilhar no WhatsApp.
          </p>
        </blockquote>
      </aside>
    </main>
  );
}

export function CampoTexto({
  rotulo,
  valor,
  onChange,
  erro,
  tipo = "text",
  placeholder,
  autoComplete,
  id,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  erro?: string;
  tipo?: string;
  placeholder?: string;
  autoComplete?: string;
  id: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {rotulo}
      </label>
      <input
        id={id}
        type={tipo}
        value={valor}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={!!erro}
        aria-describedby={erro ? `${id}-erro` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`h-12 w-full rounded-xl border bg-card px-3 text-sm outline-none transition-colors focus:border-ink ${
          erro ? "border-ember" : "border-border"
        }`}
      />
      {erro && (
        <p id={`${id}-erro`} className="mt-1.5 text-xs text-ember">
          {erro}
        </p>
      )}
    </div>
  );
}
