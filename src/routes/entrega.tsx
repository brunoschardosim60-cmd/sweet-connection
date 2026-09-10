import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRightLeft, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthSession } from "@/hooks/use-auth-session";
import { supabase } from "@/integrations/supabase/client";
import {
  botaoEntrega as botao,
  mensagemEntrega,
  type ConviteLoja,
} from "@/components/operacao/EntregaLoja";

export const Route = createFileRoute("/entrega")({
  validateSearch: (s: Record<string, unknown>): { convite?: string } =>
    typeof s["convite"] === "string" &&
    /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(s["convite"])
      ? { convite: s["convite"] }
      : {},
  head: () => ({
    meta: [
      { title: "Receber loja — Nexa" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: Entrega,
});
function Entrega() {
  const { user, carregando } = useAuthSession();
  const { convite } = Route.useSearch();
  return (
    <main className="min-h-dvh bg-background px-4 py-10 text-foreground sm:py-16">
      <div className="mx-auto max-w-2xl space-y-6">
        <ArrowRightLeft className="text-primary" size={36} />
        <div>
          <h1 className="text-3xl font-bold">Entrega da loja</h1>
          <p className="mt-2 text-muted-foreground">
            Sua empresa, na sua conta — com acesso independente.
          </p>
        </div>
        {!convite ? (
          <p role="alert">O link do convite é inválido. Peça um novo link ao criador.</p>
        ) : carregando ? (
          <p role="status">Carregando sessão…</p>
        ) : !user ? (
          <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <p>
              Entre com o e-mail autorizado pelo criador. Se ainda não tem uma conta, cadastre esse
              mesmo e-mail e confirme-o antes de aceitar.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/login"
                search={{ retorno: `/entrega?convite=${convite}` }}
                className={`${botao} bg-primary text-primary-foreground`}
              >
                Entrar para conferir
              </Link>
              <Link
                to="/cadastro"
                search={{ retorno: `/entrega?convite=${convite}` }}
                className={botao}
              >
                Criar minha conta
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              O link sozinho não concede acesso e não gera cobrança.
            </p>
          </section>
        ) : (
          <Convite
            key={`${user.id}:${convite}`}
            usuario={user.id}
            email={user.email ?? ""}
            convite={convite}
          />
        )}
        <Link to="/operacao" className={botao}>
          Voltar à operação
        </Link>
      </div>
    </main>
  );
}
function Convite({ usuario, email, convite }: { usuario: string; email: string; convite: string }) {
  const [aceite, setAceite] = useState(false),
    [ocupado, setOcupado] = useState(false),
    [cancelar, setCancelar] = useState(false),
    [erro, setErro] = useState("");
  const q = useQuery({
    queryKey: ["convite-loja", usuario, convite],
    gcTime: 0,
    retry: 1,
    queryFn: async () => {
      const r = await supabase.rpc("nexa_entrega_consultar", { convite });
      if (r.error) throw r.error;
      return r.data as unknown as ConviteLoja;
    },
  });
  const aceitar = async () => {
    if (!aceite || ocupado) return;
    setOcupado(true);
    setErro("");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("authentication_required");
      const response = await fetch("/api/stores/accept", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ convite }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "service_unavailable");
      await q.refetch();
      toast.success("Loja recebida. Agora você é o proprietário.");
    } catch (e) {
      setErro(mensagemEntrega(e));
      await q.refetch();
    } finally {
      setOcupado(false);
    }
  };
  const cancelarConvite = async () => {
    setOcupado(true);
    try {
      const r = await supabase.rpc("nexa_entrega_cancelar", { convite });
      if (r.error) throw r.error;
      await q.refetch();
      setCancelar(false);
    } catch (e) {
      setErro(mensagemEntrega(e));
    } finally {
      setOcupado(false);
    }
  };
  if (q.isPending) return <p role="status">Consultando convite e plano…</p>;
  if (q.isError || !q.data)
    return (
      <section className="space-y-4 rounded-2xl border border-border p-5">
        <p role="alert">{mensagemEntrega(q.error)}</p>
        <p className="break-all text-sm text-muted-foreground">
          Conta atual: {email}. Se o convite foi enviado para outro e-mail, saia e entre com a conta
          correta.
        </p>
        <button className={botao} onClick={() => void supabase.auth.signOut()}>
          Trocar de conta
        </button>
      </section>
    );
  const c = q.data;
  if (c.status === "aceita")
    return (
      <section className="space-y-4 rounded-2xl border border-primary/30 bg-card p-6">
        <CheckCircle2 className="text-primary" size={30} />
        <h2 className="text-xl font-bold">Loja entregue</h2>
        <p>
          <strong>{c.nome}</strong> agora pertence à conta que aceitou o convite. O site original
          mantém o endereço /site/{c.slug}.
        </p>
        {c.enviado ? (
          <>
            <p className="text-sm text-muted-foreground">
              {c.manterAcesso
                ? "Você permanece apenas como colaborador da operação. Pode sair quando quiser."
                : "Você não tem mais acesso à loja entregue."}
            </p>
            {c.copiaId && (
              <Link to="/painel/editor/$id" params={{ id: c.copiaId }} className={botao}>
                Abrir minha cópia limpa
              </Link>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Revise contatos, dados de recebimento e horários. Configure sua equipe e reconecte
              integrações e domínio, se usados. Os recursos e a publicação agora seguem seu plano.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/operacao"
                search={{ site: c.siteId }}
                className={`${botao} bg-primary text-primary-foreground`}
              >
                Operar minha loja
              </Link>
              <Link to="/painel/editor/$id" params={{ id: c.siteId }} className={botao}>
                Editar minha loja
              </Link>
            </div>
          </>
        )}
      </section>
    );
  if (c.status !== "pendente")
    return (
      <p role="status" className="rounded-2xl border border-border p-6">
        Convite {c.status}. A propriedade não foi alterada por este convite. Peça ao criador uma
        nova entrega, se necessário.
      </p>
    );
  return (
    <section className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div>
        <h2 className="text-xl font-bold">{c.nome}</h2>
        <p className="text-sm text-muted-foreground">
          /site/{c.slug} · {c.publicado ? "Publicado" : "Não publicado"}
        </p>
        <p className="mt-2 break-all text-sm">
          Novo proprietário: <strong>{c.email}</strong>
        </p>
        <p className="text-xs text-muted-foreground">
          Convite válido até {new Date(c.expiraEm).toLocaleString("pt-BR")}
        </p>
      </div>
      <div className="space-y-2 rounded-xl bg-muted p-4 text-sm">
        <p>
          A loja e seu histórico passam para a nova conta. A assinatura e a cobrança do criador não
          são transferidas.
        </p>
        <p>
          Plano mínimo para a configuração atual: <strong>{c.planoNecessario}</strong>. Nenhuma
          assinatura será contratada automaticamente.
        </p>
        <p>
          {c.manterAcesso
            ? "O criador continuará como colaborador somente da operação, até sair ou você revogar o acesso."
            : "O criador perderá acesso à loja após o aceite."}{" "}
          Os demais acessos de equipe serão removidos.
        </p>
        <p>
          {c.guardarCopia
            ? "O criador guardará uma cópia limpa do layout e catálogo, sem histórico de atendimento, contatos, integrações ou dados de recebimento."
            : "O criador não guardará uma cópia automática."}
        </p>
        <p>
          Imagens hospedadas na Nexa serão copiadas. Integrações e domínio deverão ser reconectados
          por você; links externos dependem dos provedores originais.
        </p>
      </div>
      {c.enviado ? (
        <>
          <p className="text-sm">
            Aguardando o cliente entrar com o e-mail indicado e aceitar. Você ainda é o proprietário
            e pode continuar editando.
          </p>
          <button
            className={botao}
            onClick={() =>
              void navigator.clipboard
                .writeText(`${window.location.origin}/entrega?convite=${convite}`)
                .then(
                  () => toast.success("Convite copiado"),
                  () => toast.error("Copie o endereço desta página."),
                )
            }
          >
            Copiar convite para o cliente
          </button>
        </>
      ) : (
        <>
          {c.impedimento && (
            <div
              role="alert"
              className="space-y-3 rounded-xl border border-amber-500/40 p-4 text-sm"
            >
              <p>{mensagemEntrega(c.impedimento)}</p>
              <Link to="/painel/meu-plano" className={botao}>
                Conferir meu plano
              </Link>
              <button className={botao} onClick={() => void q.refetch()}>
                Já atualizei — verificar novamente
              </button>
            </div>
          )}
          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input
              className="mt-1"
              type="checkbox"
              checked={aceite}
              disabled={ocupado}
              onChange={(e) => setAceite(e.target.checked)}
            />
            <span>
              Conferi as condições e aceito assumir a propriedade, os dados desta loja e sua
              administração na minha conta.
            </span>
          </label>
          <button
            className={`${botao} w-full bg-primary text-primary-foreground`}
            disabled={!aceite || ocupado || !!c.impedimento}
            onClick={() => void aceitar()}
          >
            {ocupado ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Copiando arquivos e transferindo…
              </>
            ) : (
              "Aceitar e receber minha loja"
            )}
          </button>
          {ocupado && (
            <p role="status" className="text-xs text-muted-foreground">
              Aguarde nesta tela. Em caso de interrupção, atualize o convite antes de tentar
              novamente.
            </p>
          )}
        </>
      )}
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
      <div className="border-t border-border pt-3">
        {cancelar ? (
          <div className="flex flex-wrap gap-2">
            <button
              className={`${botao} text-destructive`}
              disabled={ocupado}
              onClick={() => void cancelarConvite()}
            >
              {c.enviado ? "Confirmar revogação" : "Confirmar recusa"}
            </button>
            <button className={botao} onClick={() => setCancelar(false)}>
              Voltar
            </button>
          </div>
        ) : (
          <button
            className="min-h-11 text-sm text-destructive"
            disabled={ocupado}
            onClick={() => setCancelar(true)}
          >
            {c.enviado ? "Revogar convite" : "Recusar entrega"}
          </button>
        )}
      </div>
    </section>
  );
}
