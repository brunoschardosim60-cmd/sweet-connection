import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { brand } from "@/lib/nexa/brand";
import { useNexa } from "@/lib/nexa/hooks";

export const Route = createFileRoute("/painel/configuracoes")({
  component: Configuracoes,
});

function Configuracoes() {
  const { store } = useNexa();
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Dados da plataforma e gestão dos dados locais.
        </p>
      </div>

      <div className="surface space-y-4 p-6">
        <p className="font-semibold">Identidade da plataforma</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["Nome", brand.nome],
            ["Domínio", brand.dominio],
            ["WhatsApp comercial", brand.whatsappComercial],
            ["E-mail", brand.emailContato],
          ].map(([r, v]) => (
            <label key={r} className="text-sm font-medium">
              {r}
              <input
                defaultValue={v}
                readOnly
                className="mt-1.5 w-full rounded-xl border border-input bg-secondary px-3 py-2.5 text-sm"
              />
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          A identidade é definida em um único arquivo de marca — trocar o nome e as cores não
          exige mexer nas telas.
        </p>
      </div>

      <div className="surface space-y-4 p-6">
        <p className="font-semibold">Dados locais</p>
        <p className="text-sm text-muted-foreground">
          Nesta versão tudo é salvo no navegador. A arquitetura já está pronta para um banco de
          dados futuro.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              void store.restaurarDemo();
              toast.success("Dados de demonstração restaurados");
            }}
            className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-ink-foreground"
          >
            Restaurar dados de demonstração
          </button>
          <button
            type="button"
            onClick={() => {
              void store.limpar();
              toast.success("Dados locais apagados");
            }}
            className="rounded-full border border-border px-4 py-2.5 text-sm font-semibold"
          >
            Apagar tudo
          </button>
        </div>
      </div>

      <div className="surface space-y-3 p-6">
        <p className="font-semibold">Integrações</p>
        {["Google Analytics", "Pixel da Meta", "Domínio personalizado", "API do WhatsApp"].map((i) => (
          <div key={i} className="flex items-center justify-between gap-3 text-sm">
            <span>{i}</span>
            <button
              type="button"
              onClick={() => toast("Recurso disponível em breve")}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
            >
              Em breve
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
