import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/acesso-negado")({
  head: () => ({
    meta: [
      { title: "Acesso não autorizado — Nexa" },
      { name: "description", content: "Você não tem permissão para acessar esta área da Nexa." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Acesso não autorizado — Nexa" },
      { property: "og:description", content: "Entre com sua conta para continuar." },
    ],
  }),
  component: AcessoNegado,
});

function AcessoNegado() {
  return (
    <AuthShell titulo="Acesso não autorizado" subtitulo="Esta área é restrita à sua conta Nexa.">
      <div className="rounded-2xl border border-border bg-card p-5">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-foreground">
          <Lock size={19} />
        </span>
        <p className="mt-3 text-sm text-muted-foreground">
          Entre com sua conta para continuar. Se você acredita que isso é um erro, verifique se está
          usando o e-mail correto.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            to="/login"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-ink text-sm font-semibold text-ink-foreground"
          >
            Entrar
          </Link>
          <Link
            to="/"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-border text-sm font-medium hover:bg-secondary"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
