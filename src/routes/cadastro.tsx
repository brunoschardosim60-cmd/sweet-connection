import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { AuthShell, CampoTexto } from "@/components/auth/AuthShell";
import { CampoSenha, senhaValida } from "@/components/auth/CampoSenha";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Criar conta na Nexa" },
      {
        name: "description",
        content: "Crie sua conta Nexa e comece a publicar mini-sites para pequenos negócios.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Criar conta na Nexa" },
      { property: "og:description", content: "Crie sua conta Nexa em poucos segundos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Cadastro,
});

const emailValido = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

function Cadastro() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [termos, setTermos] = useState(false);
  const [tocado, setTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const erros = {
    nome: nome.trim().length < 2 ? "Informe seu nome completo." : undefined,
    email: !emailValido(email) ? "Informe um e-mail válido." : undefined,
    senha: !senhaValida(senha)
      ? "A senha precisa ter 6 caracteres e um caractere especial."
      : undefined,
    confirmacao: confirmacao !== senha ? "As senhas não coincidem." : undefined,
    termos: !termos ? "É preciso aceitar os termos para continuar." : undefined,
  };
  const valido = Object.values(erros).every((e) => !e);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setTocado(true);
    setAviso(null);
    if (!valido) return;
    setEnviando(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: senha,
      options: {
        data: {
          display_name: nome.trim(),
          terms_version: "2026-08-16",
          terms_accepted_at: new Date().toISOString(),
        },
      },
    });

    if (error) {
      setEnviando(false);
      setAviso(
        error.message.toLowerCase().includes("already registered")
          ? "Já existe uma conta com este e-mail."
          : `Não foi possível criar a conta: ${error.message}`,
      );
      return;
    }

    if (!data.session) {
      setEnviando(false);
      setAviso(
        "A conta foi criada, mas o Supabase ainda exige confirmação por e-mail. Desative essa exigência nas configurações de Auth para acesso imediato.",
      );
      return;
    }

    await navigate({ to: "/painel", replace: true });
  };

  return (
    <AuthShell
      titulo="Criar minha conta"
      subtitulo="Cada pessoa tem a própria conta e os próprios mini-sites."
      rodape={
        <>
          Já tenho uma conta.{" "}
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center font-semibold text-foreground underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={enviar} noValidate className="space-y-4">
        <CampoTexto
          id="cad-nome"
          rotulo="Nome"
          autoComplete="name"
          placeholder="Maria Silva"
          valor={nome}
          onChange={setNome}
          erro={tocado ? erros.nome : undefined}
        />
        <CampoTexto
          id="cad-email"
          rotulo="E-mail"
          tipo="email"
          autoComplete="email"
          placeholder="voce@empresa.com.br"
          valor={email}
          onChange={setEmail}
          erro={tocado ? erros.email : undefined}
        />
        <CampoSenha
          id="cad-senha"
          rotulo="Senha"
          autoComplete="new-password"
          requisitos
          valor={senha}
          onChange={setSenha}
          erro={tocado ? erros.senha : undefined}
        />
        <CampoSenha
          id="cad-confirmacao"
          rotulo="Confirmar senha"
          autoComplete="new-password"
          valor={confirmacao}
          onChange={setConfirmacao}
          erro={tocado ? erros.confirmacao : undefined}
        />

        <div>
          <div className="flex items-start gap-1 text-sm">
            <span className="-ml-2.5 grid h-11 w-11 shrink-0 place-items-center">
              <input
                id="cad-termos"
                type="checkbox"
                checked={termos}
                onChange={(e) => setTermos(e.target.checked)}
                aria-invalid={tocado && !!erros.termos}
                aria-describedby={tocado && erros.termos ? "cad-termos-erro" : undefined}
                className="h-5 w-5 shrink-0 rounded border-border"
              />
            </span>
            <p className="pt-2.5 leading-6 text-muted-foreground">
              <label htmlFor="cad-termos" className="cursor-pointer">
                Li e aceito os
              </label>{" "}
              <Link
                to="/termos"
                target="_blank"
                className="text-foreground underline underline-offset-2"
              >
                termos de uso
              </Link>{" "}
              e a{" "}
              <Link
                to="/privacidade"
                target="_blank"
                className="text-foreground underline underline-offset-2"
              >
                política de privacidade
              </Link>
              .
            </p>
          </div>
          {tocado && erros.termos && (
            <p id="cad-termos-erro" className="mt-1.5 text-xs text-ember">
              {erros.termos}
            </p>
          )}
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
          {enviando ? "Criando conta…" : "Criar conta"}
        </button>
      </form>
    </AuthShell>
  );
}
