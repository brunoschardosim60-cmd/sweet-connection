import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type ConviteLoja = {
  id: string;
  siteId: string;
  nome: string;
  slug: string;
  email: string;
  status: string;
  expiraEm: string;
  enviado: boolean;
  manterAcesso: boolean;
  guardarCopia: boolean;
  copiaId: string | null;
  destinatario?: boolean;
  publicado?: boolean;
  planoNecessario?: string;
  impedimento?: string | null;
};
export const botaoEntrega =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50";
export function mensagemEntrega(error: unknown) {
  const codigo =
    typeof error === "string" ? error : ((error as { message?: string })?.message ?? "");
  const textos: Record<string, string> = {
    not_allowed:
      "Entre com o e-mail autorizado no convite. Somente o proprietário pode enviar ou revogar a entrega.",
    authentication_required: "Entre novamente e confirme seu e-mail para continuar.",
    already_owner: "Este e-mail já pertence ao proprietário da loja.",
    invalid_email: "Informe um e-mail válido.",
    invitation_limit: "Limite de convites atingido. Tente novamente amanhã.",
    invitation_unavailable: "O convite expirou, foi cancelado ou a loja já mudou de proprietário.",
    subscription_required:
      "O novo proprietário precisa de uma assinatura ativa antes de receber a loja. O plano do criador não é transferido.",
    plan_upgrade_required:
      "O plano da nova conta não inclui todos os recursos desta loja. Escolha o plano indicado antes de aceitar.",
    minisite_creation_limit_reached:
      "O limite de projetos foi atingido. Revise o plano do destinatário e o espaço para a cópia do criador antes de tentar novamente.",
    site_changed:
      "A loja foi editada durante a preparação. Confira novamente e tente aceitar outra vez.",
    account_unavailable: "Esta conta não está disponível para receber a loja. Fale com o suporte.",
    media_copy_failed:
      "Não foi possível copiar todas as imagens. A propriedade não foi alterada. Peça ao criador para revisar os arquivos e tente novamente.",
    too_many_media:
      "Esta loja tem muitos arquivos para a entrega automática. Peça ao suporte para ajudar com a transferência.",
    rate_limit_exceeded:
      "Muitas tentativas de entrega. Aguarde uma hora antes de tentar novamente.",
  };
  return (
    Object.entries(textos).find(([chave]) => codigo.includes(chave))?.[1] ??
    "Não foi possível concluir a entrega. Nenhuma transferência deve ser presumida: atualize o convite para conferir o status."
  );
}
export function ConvitesLoja({ usuario }: { usuario: string }) {
  const q = useQuery({
    queryKey: ["entregas-loja", usuario],
    gcTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const r = await supabase.rpc("nexa_entregas_listar");
      if (r.error) throw r.error;
      return r.data as unknown as ConviteLoja[];
    },
  });
  if (q.isPending)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Consultando convites de entrega…
      </p>
    );
  if (q.isError)
    return (
      <p role="alert" className="text-sm">
        Não foi possível consultar os convites.{" "}
        <button className={botaoEntrega} onClick={() => void q.refetch()}>
          Tentar novamente
        </button>
      </p>
    );
  if (!q.data.length) return null;
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <ArrowRightLeft size={18} />
        Entregas de lojas
      </h2>
      <p className="text-xs text-muted-foreground">
        Transferir propriedade é diferente de compartilhar a operação. Cada cliente usa a própria
        conta e o próprio plano.
      </p>
      <ul className="divide-y divide-border">
        {q.data.slice(0, 30).map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold">{c.nome}</p>
              <p className="break-all text-xs text-muted-foreground">
                {c.enviado ? "Enviado para" : "Recebido por"} {c.email} · {c.status}
              </p>
            </div>
            <Link to="/entrega" search={{ convite: c.id }} className={botaoEntrega}>
              {c.status === "pendente" ? "Conferir convite" : "Ver entrega"}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
export function EntregarLoja({ siteId, nome }: { siteId: string; nome: string }) {
  const [email, setEmail] = useState(""),
    [manter, setManter] = useState(false),
    [copia, setCopia] = useState(true),
    [confirmacao, setConfirmacao] = useState(false),
    [ocupado, setOcupado] = useState(false),
    [convite, setConvite] = useState<string | null>(null);
  const criar = async () => {
    if (!confirmacao || ocupado) return;
    setOcupado(true);
    try {
      const r = await supabase.rpc("nexa_entrega_criar", {
        site_id: siteId,
        email,
        manter_acesso: manter,
        guardar_copia: copia,
      });
      if (r.error) throw r.error;
      setConvite(r.data);
      setConfirmacao(false);
      toast.success("Convite criado. A loja só muda de dono depois do aceite.");
    } catch (e) {
      toast.error(mensagemEntrega(e));
    } finally {
      setOcupado(false);
    }
  };
  return (
    <section className="mt-6 max-w-2xl space-y-4 rounded-2xl border border-primary/30 bg-card p-5 sm:p-6">
      <h3 className="flex items-center gap-2 text-xl font-bold">
        <ArrowRightLeft size={21} />
        Entregar a loja ao cliente
      </h3>
      <p className="text-sm text-muted-foreground">
        Transfira a propriedade de <strong>{nome}</strong>. O cliente passará a administrar esta
        loja na própria conta. Seu link e histórico são mantidos; seus outros projetos não são
        compartilhados.
      </p>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void criar();
        }}
      >
        <label className="block text-sm font-medium">
          E-mail do novo proprietário
          <input
            className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3"
            required
            type="email"
            maxLength={254}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setConfirmacao(false);
            }}
            placeholder="dono@empresa.com"
          />
        </label>
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input
            className="mt-1"
            type="checkbox"
            checked={manter}
            onChange={(e) => {
              setManter(e.target.checked);
              setConfirmacao(false);
            }}
          />
          <span>
            Continuar como colaborador da operação após o aceite
            <span className="block text-xs text-muted-foreground">
              Sem editor nem propriedade. Você poderá sair depois e o cliente poderá revogar seu
              acesso.
            </span>
          </span>
        </label>
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input
            className="mt-1"
            type="checkbox"
            checked={copia}
            onChange={(e) => {
              setCopia(e.target.checked);
              setConfirmacao(false);
            }}
          />
          <span>
            Guardar uma cópia limpa como rascunho na minha conta
            <span className="block text-xs text-muted-foreground">
              Layout e catálogo, sem pedidos, agenda, contatos, equipe, credenciais ou recebimentos.
              Ocupa uma vaga de projeto e segue o seu plano.
            </span>
          </span>
        </label>
        <div className="space-y-2 rounded-xl bg-muted p-4 text-sm">
          <p>
            A entrega só é concluída se o cliente confirmar o e-mail e tiver plano compatível. Até
            lá, nada muda na loja.
          </p>
          <p>
            Os acessos anteriores da equipe serão removidos. Integrações de rastreamento, domínio e
            credenciais precisam ser reconectadas pelo novo dono. As imagens hospedadas na Nexa são
            copiadas para a conta dele; mídia externa continua no provedor original.
          </p>
          <p>
            Confira se você pode compartilhar o conteúdo e os dados de atendimento com o
            destinatário. Não há cobrança nem envio automático de e-mail ao criar este convite.
          </p>
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            required
            checked={confirmacao}
            onChange={(e) => setConfirmacao(e.target.checked)}
          />
          Entendi as condições e quero gerar o convite para esse e-mail.
        </label>
        <button
          className={`${botaoEntrega} bg-primary text-primary-foreground`}
          disabled={!confirmacao || ocupado}
        >
          {ocupado ? <Loader2 size={16} className="animate-spin" /> : null}Gerar convite de entrega
        </button>
      </form>
      {convite && (
        <div className="space-y-3 rounded-xl border border-border p-4">
          <p role="status" className="text-sm">
            Convite pronto. Válido por 7 dias e somente para o e-mail indicado. Criar outro convite
            revoga o anterior.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className={botaoEntrega}
              onClick={() =>
                void navigator.clipboard
                  .writeText(`${window.location.origin}/entrega?convite=${convite}`)
                  .then(
                    () => toast.success("Link copiado"),
                    () => toast.error("Use o endereço da tela de convite para compartilhar."),
                  )
              }
            >
              <Copy size={15} />
              Copiar convite
            </button>
            <Link className={botaoEntrega} to="/entrega" search={{ convite }}>
              Ver convite
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
