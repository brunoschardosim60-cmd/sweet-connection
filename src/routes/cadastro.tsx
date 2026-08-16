import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { AuthShell, CampoTexto } from "@/components/auth/AuthShell";
import { CampoSenha, senhaValida } from "@/components/auth/CampoSenha";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Criar conta na Nexa" },
      {
        name: "description",
        content: "Crie sua conta Nexa e comece a publicar mini-sites para pequenos negócios.",
      },
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

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setTocado(true);
    setAviso(null);
    if (!valido) return;
    setEnviando(true);
    // O cadastro real ainda não está conectado — nenhuma conta é criada aqui.
    setEnviando(false);
    setAviso("O cadastro ainda não está conectado ao servidor de contas. Nenhuma conta foi criada.");
  };

  return (
    <AuthShell
      titulo="Criar minha conta"
      subtitulo="Cada pessoa tem a própria conta e os próprios mini-sites."
      rodape={
        <>
          Já tenho uma conta.{" "}
          <Link to="/login" className="font-semibold text-foreground underline">
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
          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={termos}
              onChange={(e) => setTermos(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span className="text-muted-foreground">
              Li e aceito os <span className="text-foreground underline">termos de uso</span> e a{" "}
              <span className="text-foreground underline">política de privacidade</span>.
            </span>
          </label>
          {tocado && erros.termos && <p className="mt-1.5 text-xs text-ember">{erros.termos}</p>}
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
