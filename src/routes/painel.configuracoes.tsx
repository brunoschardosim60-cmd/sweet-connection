import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { BotaoRemover } from "@/components/editor/BotaoRemover";
import { ExcluirConta } from "@/components/account/ExcluirConta";
import { useNexa } from "@/lib/nexa/hooks";

export const Route = createFileRoute("/painel/configuracoes")({
  component: Configuracoes,
});

function Configuracoes() {
  const { store, sites } = useNexa();
  const [salvandoAssinatura, setSalvandoAssinatura] = useState(false);
  const mostrarAssinatura = sites.some((site) => site.mostrarAssinaturaNexa !== false);

  async function alterarAssinatura(mostrar: boolean) {
    setSalvandoAssinatura(true);
    try {
      await Promise.all(
        sites.map((site) => store.atualizarSite(site.id, { mostrarAssinaturaNexa: mostrar })),
      );
      toast.success(
        mostrar ? "Assinatura ativada nos seus projetos" : "Assinatura removida dos seus projetos",
      );
    } catch (error) {
      toast.error("Não foi possível salvar a assinatura", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSalvandoAssinatura(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Minha conta</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie a assinatura exibida nos seus mini-sites e cardápios, seus dados e integrações.
        </p>
      </div>

      <div className="surface space-y-4 p-6">
        <div>
          <p className="font-semibold">Assinatura Nexa nos seus sites</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Este ajuste vale somente para o rodapé dos mini-sites e cardápios que você criou. Ele
            nunca altera o painel, a landing page nem a marca Nexa.
          </p>
        </div>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
          <span>
            Exibir “Criado com Nexa” no rodapé
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Ao desligar, o rodapé público deixa de mostrar a assinatura da plataforma.
            </span>
          </span>
          <input
            type="checkbox"
            checked={mostrarAssinatura}
            disabled={salvandoAssinatura || sites.length === 0}
            onChange={(e) => void alterarAssinatura(e.target.checked)}
            className="h-5 w-5 accent-lime"
          />
        </label>
        <p className="text-xs text-muted-foreground">
          A alteração é salva nos rascunhos. Para atualizar um endereço que já está publicado, abra
          o projeto e publique-o novamente.
        </p>
      </div>

      <div className="surface space-y-3 p-6">
        <p className="font-semibold">Endereço dos mini-sites e cardápios</p>
        <p className="text-sm text-muted-foreground">
          Seus links usam o endereço em que a aplicação está aberta, no formato{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">/site/slug</code> e{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">/site/slug/cardapio</code>.
          Domínios próprios por cliente continuam identificados como integração futura no editor.
        </p>
      </div>

      <div className="surface space-y-4 p-6">
        <p className="font-semibold">Dados da conta</p>
        <p className="text-sm text-muted-foreground">
          Clientes, mini-sites, cardápios e formulários são armazenados no Supabase e isolados pela
          sua conta.
        </p>
        <p className="rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
          Contas sem atividade por 180 dias entram em uma carência de 30 dias. Um novo acesso
          durante a carência cancela automaticamente a exclusão. Depois de 210 dias sem atividade, a
          conta e seus dados podem ser removidos permanentemente.
        </p>
        <div className="flex flex-wrap gap-3">
          <BotaoRemover
            rotulo="Apagar tudo"
            descricao="Apagar permanentemente todos os clientes, mini-sites, cardápios e envios desta conta?"
            onConfirmar={() => {
              void store
                .limpar()
                .then(() => toast.success("Dados da conta apagados"))
                .catch((error: unknown) =>
                  toast.error("Não foi possível apagar os dados", {
                    description: error instanceof Error ? error.message : undefined,
                  }),
                );
            }}
          />
          <ExcluirConta />
        </div>
      </div>

      <div className="surface space-y-3 p-6">
        <p className="font-semibold">Integrações</p>
        {["Google Analytics", "Pixel da Meta", "Domínio personalizado", "API do WhatsApp"].map(
          (integracao) => (
            <div key={integracao} className="flex items-center justify-between gap-3 text-sm">
              <span>{integracao}</span>
              <button
                type="button"
                onClick={() => toast("Recurso disponível em breve")}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
              >
                Em breve
              </button>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
