import { createFileRoute } from "@tanstack/react-router";
import { GraficoArea } from "@/components/Graficos";
import { useDesempenho, useNexa } from "@/lib/nexa/hooks";
import { numero } from "@/lib/nexa/utils";

export const Route = createFileRoute("/painel/estatisticas")({
  component: Estatisticas,
});

function Estatisticas() {
  const { sites, envios } = useNexa();
  const desempenho = useDesempenho();
  const reais = sites.map((site) => ({ site, dados: desempenho[site.id] }));
  const visitas = reais.reduce((total, item) => total + (item.dados?.visitas ?? 0), 0);
  const cliques = reais.reduce((total, item) => total + (item.dados?.cliques ?? 0), 0);
  const whatsapp = reais.reduce((total, item) => total + (item.dados?.cliquesWhatsapp ?? 0), 0);
  const conversao = visitas ? ((envios.length / visitas) * 100).toFixed(1) : "0";
  const principal = sites[0];
  const dadosPrincipal = principal ? desempenho[principal.id] : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Estatísticas</h1>
        <p className="text-sm text-muted-foreground">
          Visitas, cliques e formulários centralizados no Supabase para todos os dispositivos.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Metrica rotulo="Visitas" valor={numero(visitas)} />
        <Metrica rotulo="Cliques" valor={numero(cliques)} />
        <Metrica rotulo="WhatsApp" valor={numero(whatsapp)} />
        <Metrica rotulo="Conversão por formulário" valor={`${conversao}%`} />
      </div>

      {visitas + cliques + envios.length === 0 ? (
        <div className="surface p-6 text-sm text-muted-foreground">
          Ainda não há registros. As métricas aparecerão depois que um mini-site publicado receber
          visitas, cliques ou formulários.
        </div>
      ) : (
        <div className="surface p-5">
          <p className="font-semibold">Desempenho por mini-site</p>
          <ul className="mt-4 space-y-3">
            {reais.map(({ site, dados }) => (
              <li key={site.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">{site.conteudo.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {numero(dados?.visitas ?? 0)} visitas · {numero(dados?.cliques ?? 0)} cliques ·{" "}
                    {numero(dados?.formularios ?? 0)} formulários
                  </p>
                </div>
                {dados && Object.keys(dados.porLink).length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {Object.entries(dados.porLink)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([rotulo, valor]) => (
                        <li key={rotulo} className="flex items-center gap-3 text-xs">
                          <span className="w-40 shrink-0 truncate text-muted-foreground">
                            {rotulo}
                          </span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                            <span
                              className="block h-full rounded-full bg-lime"
                              style={{
                                width: `${Math.round((valor / Math.max(...Object.values(dados.porLink))) * 100)}%`,
                              }}
                            />
                          </span>
                          <span className="w-8 shrink-0 text-right font-medium">{valor}</span>
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {principal && dadosPrincipal && dadosPrincipal.dias.length > 0 && (
        <div className="surface p-5">
          <p className="font-semibold">Visitas por dia — {principal.conteudo.nome}</p>
          <div className="mt-4 h-56">
            <GraficoArea
              dados={dadosPrincipal.dias.map((p) => ({ rotulo: p.dia, valor: p.visitas }))}
              ariaLabel={`Visitas diárias de ${principal.conteudo.nome}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Metrica({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="surface p-5">
      <p className="text-sm text-muted-foreground">{rotulo}</p>
      <p className="font-display text-3xl font-bold">{valor}</p>
    </div>
  );
}
