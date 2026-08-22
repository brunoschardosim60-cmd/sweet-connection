import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, Download, Loader2, Megaphone, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAdminDados, useIsAdmin } from "@/lib/nexa/admin";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/painel/admin/operacoes")({ component: OperacoesAdmin });

type Saude = {
  notification_failures_7d: number;
  notifications_pending_24h: number;
  overdue_invoices: number;
  accounts_suspended: number;
  forms_24h: number;
  orders_24h: number;
};

const TIER = {
  none: "Teste grátis",
  essential: "Essencial",
  professional: "Profissional",
  catalog: "Catálogo",
} as const;

function baixarJson(nome: string, conteudo: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(conteudo, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}

function OperacoesAdmin() {
  const { admin, carregando: checando } = useIsAdmin();
  const { usuarios, carregando, erro, recarregar } = useAdminDados(30);
  const [saude, setSaude] = useState<Saude | null>(null);
  const [conta, setConta] = useState("");
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [destino, setDestino] = useState<"" | keyof typeof TIER>("");

  const selecionada = useMemo(
    () => usuarios.find((usuario) => usuario.user_id === conta),
    [conta, usuarios],
  );

  const carregarSaude = async () => {
    const { data, error: falha } = await (supabase as any).rpc("nexa_admin_health");
    if (falha) {
      toast.error(falha.message);
      return;
    }
    setSaude(data as Saude);
  };

  useEffect(() => {
    if (admin) void carregarSaude();
  }, [admin]);

  const exportarConta = async () => {
    if (!conta) return;
    setOcupado(true);
    const { data, error: falha } = await (supabase as any).rpc("nexa_admin_export_account", {
      requested_user_id: conta,
    });
    setOcupado(false);
    if (falha) {
      toast.error(falha.message);
      return;
    }
    baixarJson(`dados-${selecionada?.email ?? conta}.json`, data);
    toast.success("Arquivo LGPD exportado.");
  };

  const alterarSuspensao = async (suspender: boolean) => {
    if (!conta) return;
    if (suspender && !motivo.trim()) {
      toast.error("Informe o motivo da suspensão.");
      return;
    }
    setOcupado(true);
    const { error: falha } = await (supabase as any).rpc("nexa_admin_set_account_suspension", {
      requested_user_id: conta,
      requested_suspended: suspender,
      requested_reason: motivo.trim() || null,
    });
    setOcupado(false);
    if (falha) {
      toast.error(falha.message);
      return;
    }
    setMotivo("");
    toast.success(suspender ? "Conta marcada como suspensa." : "Conta reativada.");
    await recarregar();
    await carregarSaude();
  };

  const publicarAviso = async () => {
    if (titulo.trim().length < 3 || mensagem.trim().length < 3) {
      toast.error("Informe título e mensagem com pelo menos 3 caracteres.");
      return;
    }
    setOcupado(true);
    const { error: falha } = await (supabase as any).rpc("nexa_admin_create_announcement", {
      requested_title: titulo.trim(),
      requested_message: mensagem.trim(),
      requested_target_tier: destino || null,
      requested_ends_at: null,
    });
    setOcupado(false);
    if (falha) {
      toast.error(falha.message);
      return;
    }
    setTitulo("");
    setMensagem("");
    setDestino("");
    toast.success("Aviso publicado no painel das contas selecionadas.");
  };

  if (checando || (carregando && !erro)) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (!admin) return <p className="surface p-6 text-center">Área restrita.</p>;

  const indicadores = saude
    ? [
        ["Falhas de notificação (7d)", saude.notification_failures_7d],
        ["Notificações pendentes", saude.notifications_pending_24h],
        ["Cobranças vencidas", saude.overdue_invoices],
        ["Contas suspensas", saude.accounts_suspended],
        ["Formulários (24h)", saude.forms_24h],
        ["Pedidos (24h)", saude.orders_24h],
      ]
    : [];

  return (
    <section className="space-y-6">
      <Link
        to="/painel/admin"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={15} /> Voltar para administração
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Operação e segurança</h1>
          <p className="text-sm text-muted-foreground">
            Controles administrativos com auditoria. Nenhuma chave ou segredo é exibido aqui.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void carregarSaude()}
          className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary"
        >
          Atualizar saúde
        </button>
      </header>
      {erro && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 p-3 text-sm text-destructive"
        >
          {erro}
        </p>
      )}

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-bold">Saúde da plataforma</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {indicadores.map(([nome, valor]) => (
            <div key={nome} className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">{nome}</p>
              <p className="mt-1 text-2xl font-bold">{valor}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Logs de Vercel, Supabase, Asaas e Gemini continuam nos respectivos provedores; este painel
          consolida somente eventos persistidos pela Nexa.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 font-bold">
            <ShieldAlert size={17} /> Conta, suporte e LGPD
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            A suspensão é registrada e bloqueia o acesso comercial no painel. Para banir login e
            revogar sessões, ative a política de banimento no Supabase Auth antes de usar esse
            controle em produção.
          </p>
          <label className="mt-4 block text-sm font-semibold">
            Conta
            <select
              value={conta}
              onChange={(e) => setConta(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="">Selecione uma conta</option>
              {usuarios.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.email ?? u.user_id}
                </option>
              ))}
            </select>
          </label>
          {selecionada && (
            <p className="mt-2 text-xs text-muted-foreground">
              {selecionada.sites} site(s) · {selecionada.sites_publicados} publicado(s)
            </p>
          )}
          <label className="mt-3 block text-sm font-semibold">
            Motivo da suspensão
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="mt-1 min-h-20 w-full rounded-xl border border-border bg-background p-3 text-sm"
              placeholder="Ex.: solicitação de suporte ou inadimplência confirmada"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              disabled={!conta || ocupado}
              onClick={() => void exportarConta()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold disabled:opacity-50"
            >
              <Download size={14} /> Exportar dados
            </button>
            <button
              disabled={!conta || ocupado}
              onClick={() => void alterarSuspensao(true)}
              className="min-h-11 rounded-full bg-destructive px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              Suspender
            </button>
            <button
              disabled={!conta || ocupado}
              onClick={() => void alterarSuspensao(false)}
              className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold disabled:opacity-50"
            >
              Reativar
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 font-bold">
            <Megaphone size={17} /> Aviso no painel
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Publica uma mensagem dentro do painel das contas. E-mail/WhatsApp exigem a configuração
            dos provedores de notificação.
          </p>
          <label className="mt-4 block text-sm font-semibold">
            Título
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={120}
              className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="mt-3 block text-sm font-semibold">
            Mensagem
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              maxLength={2000}
              className="mt-1 min-h-24 w-full rounded-xl border border-border bg-background p-3 text-sm"
            />
          </label>
          <label className="mt-3 block text-sm font-semibold">
            Destinatários
            <select
              value={destino}
              onChange={(e) => setDestino(e.target.value as "" | keyof typeof TIER)}
              className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="">Todas as contas</option>
              {Object.entries(TIER).map(([id, nome]) => (
                <option key={id} value={id}>
                  {nome}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={ocupado}
            onClick={() => void publicarAviso()}
            className="mt-3 min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-ink-foreground disabled:opacity-50"
          >
            Publicar aviso
          </button>
        </div>
      </section>
    </section>
  );
}
