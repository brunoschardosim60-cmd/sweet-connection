import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, ArrowLeft, Check, Loader2 } from "lucide-react";
import { AuthShell, CampoTexto } from "@/components/auth/AuthShell";
import { CampoSenha, senhaValida } from "@/components/auth/CampoSenha";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — Nexa" },
      { name: "description", content: "Redefina a senha da sua conta Nexa." },
      { property: "og:title", content: "Recuperar senha — Nexa" },
      { property: "og:description", content: "Redefina a senha da sua conta Nexa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecuperarSenha,
});

type Etapa = "solicitar" | "redefinir" | "redefinida";

function RecuperarSenha() {
  const [etapa, setEtapa] = useState<Etapa>("solicitar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [tocado, setTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  const solicitar = (e: React.FormEvent) => {
    e.preventDefault();
    setTocado(true);
    setAviso(null);
    if (!emailOk) return;
    setEnviando(true);
    setEnviando(false);
    setAviso(
      "A recuperação de senha ainda não está conectada ao servidor de contas. Nenhum e-mail foi enviado.",
    );
  };

  const redefinir = (e: React.FormEvent) => {
    e.preventDefault();
    setTocado(true);
    setAviso(null);
    if (!senhaValida(senha) || senha !== confirmacao) return;
    setAviso("A redefinição ainda não está conectada ao servidor de contas. Nada foi alterado.");
  };

  if (etapa === "redefinida") {
    return (
      <AuthShell titulo="Senha redefinida" subtitulo="Você já pode entrar com a nova senha.">
        <div className="rounded-2xl border border-border bg-card p-5">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-lime text-ink">
            <Check size={20} />
          </span>
          <p className="mt-3 text-sm text-muted-foreground">
            Sua senha foi atualizada. Use o e-mail e a nova senha para acessar o painel.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-ink text-sm font-semibold text-ink-foreground"
          >
            Ir para o login
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      titulo={etapa === "solicitar" ? "Recuperar senha" : "Definir nova senha"}
      subtitulo={
        etapa === "solicitar"
          ? "Informe o e-mail da sua conta para receber o link de redefinição."
          : "Escolha uma nova senha para a sua conta."
      }
      rodape={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-medium underline">
          <ArrowLeft size={14} /> Voltar para o login
        </Link>
      }
    >
      {etapa === "solicitar" ? (
        <form onSubmit={solicitar} noValidate className="space-y-4">
          <CampoTexto
            id="rec-email"
            rotulo="E-mail"
            tipo="email"
            autoComplete="email"
            placeholder="voce@empresa.com.br"
            valor={email}
            onChange={setEmail}
            erro={tocado && !emailOk ? "Informe um e-mail válido." : undefined}
          />
          <Aviso texto={aviso} />
          <button
            type="submit"
            disabled={enviando}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-sm font-semibold text-ink-foreground disabled:opacity-60"
          >
            {enviando && <Loader2 size={16} className="animate-spin" />}
            Enviar link de redefinição
          </button>
          <button
            type="button"
            onClick={() => {
              setEtapa("redefinir");
              setTocado(false);
              setAviso(null);
            }}
            className="h-11 w-full rounded-full border border-border text-sm font-medium hover:bg-secondary"
          >
            Já tenho um link de redefinição
          </button>
        </form>
      ) : (
        <form onSubmit={redefinir} noValidate className="space-y-4">
          <CampoSenha
            id="rec-senha"
            rotulo="Nova senha"
            autoComplete="new-password"
            requisitos
            valor={senha}
            onChange={setSenha}
            erro={
              tocado && !senhaValida(senha)
                ? "A senha precisa ter 6 caracteres e um caractere especial."
                : undefined
            }
          />
          <CampoSenha
            id="rec-confirmacao"
            rotulo="Confirmar nova senha"
            autoComplete="new-password"
            valor={confirmacao}
            onChange={setConfirmacao}
            erro={tocado && confirmacao !== senha ? "As senhas não coincidem." : undefined}
          />
          <Aviso texto={aviso} />
          <button
            type="submit"
            className="h-12 w-full rounded-full bg-ink text-sm font-semibold text-ink-foreground"
          >
            Salvar nova senha
          </button>
        </form>
      )}
    </AuthShell>
  );
}

function Aviso({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-border bg-secondary/60 p-3 text-sm"
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0 text-ember" />
      {texto}
    </p>
  );
}
