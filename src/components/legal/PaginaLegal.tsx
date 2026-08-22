import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

export function PaginaLegal({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/" aria-label="Voltar ao início">
            <Logo />
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary"
          >
            Voltar ao início
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Documento público
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold md:text-5xl">{titulo}</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">{descricao}</p>
        <p className="mt-3 text-xs text-muted-foreground">Atualizado em 21 de agosto de 2026.</p>

        <article className="mt-10 space-y-8 text-sm leading-7 text-muted-foreground [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-2 [&_strong]:text-foreground">
          {children}
        </article>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-4xl flex-wrap gap-x-5 gap-y-2 px-5 text-xs text-muted-foreground">
          <Link to="/termos" className="underline underline-offset-4 hover:text-foreground">
            Termos de uso
          </Link>
          <Link to="/privacidade" className="underline underline-offset-4 hover:text-foreground">
            Política de privacidade
          </Link>
        </div>
      </footer>
    </div>
  );
}
