import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { BotaoRemover } from "@/components/editor/BotaoRemover";
import { ExcluirConta } from "@/components/account/ExcluirConta";
import { useMarca, useNexa } from "@/lib/nexa/hooks";
import { marcaStore } from "@/lib/nexa/marca";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/painel/configuracoes")({
  component: Configuracoes,
});

function Configuracoes() {
  const { store, sites } = useNexa();
  const preferenciaMarca = useMarca();
  const [salvandoAssinatura, setSalvandoAssinatura] = useState(false);
  const [planoCatalogo, setPlanoCatalogo] = useState(false);
  const [carregandoPlano, setCarregandoPlano] = useState(true);
  const mostrarAssinatura = preferenciaMarca.mostrarAssinatura;

  useEffect(() => {
    let ativo = true;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("subscription_tier,subscription_status")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (ativo) {
        setPlanoCatalogo(
          data?.subscription_tier === "catalog" && data.subscription_status === "active",
        );
        setCarregandoPlano(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  async function alterarAssinatura(mostrar: boolean) {
    if (!mostrar && !planoCatalogo) {
      toast.error("A remoção da assinatura Nexa é exclusiva do plano Catálogo.");
      return;
    }
    setSalvandoAssinatura(true);
    try {
      await marcaStore.salvar({ mostrarAssinatura: mostrar });
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
              A remoção da assinatura é um benefício exclusivo do plano Catálogo.
            </span>
          </span>
          <input
            type="checkbox"
            checked={mostrarAssinatura}
            disabled={
              salvandoAssinatura || carregandoPlano || (!mostrarAssinatura && !planoCatalogo)
            }
            onChange={(e) => void alterarAssinatura(e.target.checked)}
            className="h-5 w-5 accent-lime"
          />
        </label>
        {!planoCatalogo && !carregandoPlano && (
          <p className="rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
            Mantenha a assinatura Nexa visível para divulgar a plataforma. Assine o plano Catálogo
            para entregar mini-sites e cardápios sem essa assinatura.
          </p>
        )}
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
