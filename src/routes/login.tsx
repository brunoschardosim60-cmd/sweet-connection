import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { AuthShell, CampoTexto } from "@/components/auth/AuthShell";
import { CampoSenha } from "@/components/auth/CampoSenha";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar na Nexa" },
      {
        name: "description",
        content: "Acesse sua conta Nexa para criar e editar os mini-sites dos seus clientes.",
      },
      { property: "og:title", content: "Entrar na Nexa" },
      { property: "og:description", content: "Acesse sua conta Nexa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

const emailValido = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [tocado, setTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const erroEmail = tocado && !emailValido(email) ? "Informe um e-mail válido." : undefined;
  const erroSenha = tocado && senha.length === 0 ? "Informe sua senha." : undefined;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setTocado(true);
    setAviso(null);
    if (!emailValido(email) || senha.length === 0) return;
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    });

    if (error) {
      setEnviando(false);
      setAviso(
        error.message.toLowerCase().includes("email not confirmed")
          ? "Este e-mail ainda aguarda confirmação no Supabase."
          : "E-mail ou senha incorretos.",
      );
      return;
    }

    await navigate({ to: "/painel", replace: true });
  };

  return (
    <AuthShell
      titulo="Entrar na sua conta"
      subtitulo="Use o e-mail e a senha da sua conta Nexa."
      rodape={
        <>
          Ainda não tem conta?{" "}
          <Link to="/cadastro" className="font-semibold text-foreground underline">
            Criar minha conta
          </Link>
        </>
      }
    >
      <form onSubmit={enviar} noValidate className="space-y-4">
        <CampoTexto
          id="login-email"
          rotulo="E-mail"
          tipo="email"
          autoComplete="email"
          placeholder="voce@empresa.com.br"
          valor={email}
          onChange={setEmail}
          erro={erroEmail}
        />
        <CampoSenha
          id="login-senha"
          rotulo="Senha"
          valor={senha}
          onChange={setSenha}
          erro={erroSenha}
        />

        <div className="flex justify-end">
          <Link to="/recuperar-senha" className="text-sm font-medium underline">
            Esqueci minha senha
          </Link>
        </div>

        {aviso && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-border bg-secondary/60 p-3 text-sm"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-ember" />
            {aviso}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-sm font-semibold text-ink-foreground disabled:opacity-60"
        >
          {enviando && <Loader2 size={16} className="animate-spin" />}
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </AuthShell>
  );
}
