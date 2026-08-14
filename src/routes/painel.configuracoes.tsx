import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { SeletorMidia } from "@/components/editor/SeletorMidia";
import { useMarca, useNexa } from "@/lib/nexa/hooks";
import { hostMarca, marcaStore, type Marca } from "@/lib/nexa/marca";

export const Route = createFileRoute("/painel/configuracoes")({
  component: Configuracoes,
});

const campos: { chave: keyof Marca; rotulo: string; dica?: string }[] = [
  { chave: "nome", rotulo: "Nome da plataforma" },
  { chave: "slogan", rotulo: "Slogan" },
  { chave: "dominio", rotulo: "Domínio de publicação", dica: "Ex.: suamarca.com.br" },
  { chave: "emailContato", rotulo: "E-mail de contato" },
  { chave: "whatsappComercial", rotulo: "WhatsApp comercial", dica: "Somente números com DDI" },
  { chave: "instagram", rotulo: "Instagram", dica: "Sem o @" },
  { chave: "assinatura", rotulo: "Assinatura no rodapé dos mini-sites" },
];

function Configuracoes() {
  const { store } = useNexa();
  const marca = useMarca();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Marca própria (white label), dados da plataforma e gestão dos dados locais.
        </p>
      </div>

      <div className="surface space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Marca própria (white label)</p>
            <p className="text-xs text-muted-foreground">
              Tudo o que o cliente vê — painel, site de apresentação e rodapé dos mini-sites —
              passa a usar esta identidade.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/60 px-3 py-2">
            <Logo />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Logotipo</p>
          <SeletorMidia
            valor={marca.logo}
            onChange={(v) => marcaStore.salvar({ logo: v })}
            rotulo="Logotipo da marca"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {campos.map((c) => (
            <label key={c.chave} className="text-sm font-medium">
              {c.rotulo}
              <input
                value={String(marca[c.chave] ?? "")}
                onChange={(e) => marcaStore.salvar({ [c.chave]: e.target.value } as Partial<Marca>)}
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
              />
              {c.dica && <span className="mt-1 block text-xs text-muted-foreground">{c.dica}</span>}
            </label>
          ))}
        </div>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
          <span>
            Exibir assinatura da plataforma nos mini-sites
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Desative para entregar as páginas totalmente sem marca.
            </span>
          </span>
          <input
            type="checkbox"
            checked={marca.mostrarAssinatura}
            onChange={(e) => marcaStore.salvar({ mostrarAssinatura: e.target.checked })}
            className="h-5 w-5 accent-lime"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              marcaStore.restaurar();
              toast.success("Marca padrão restaurada");
            }}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
          >
            Restaurar marca padrão
          </button>
          <p className="text-xs text-muted-foreground">Alterações são salvas automaticamente.</p>
        </div>
      </div>

      <div className="surface space-y-3 p-6">
        <p className="font-semibold">Endereço dos mini-sites</p>
        <p className="text-sm text-muted-foreground">
          Hoje os links usam o endereço em que a aplicação está aberta, no formato{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">/site/slug</code>. Ao apontar
          o seu domínio para a aplicação, os mesmos links passam a responder em{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">
            {hostMarca(marca)}/site/slug
          </code>{" "}
          — nada precisa ser refeito. Cada cliente também pode ter um domínio próprio no campo de
          integrações do editor.
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
        {["Google Analytics", "Pixel da Meta", "Domínio personalizado", "API do WhatsApp"].map(
          (i) => (
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
          ),
        )}
      </div>
    </div>
  );
}
