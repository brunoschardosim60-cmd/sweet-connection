import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, CheckCircle2, FileEdit, Globe, MessageCircle, Users } from "lucide-react";
import { GraficoArea } from "@/components/Graficos";
import { useDesempenho, useNexa } from "@/lib/nexa/hooks";
import { numero, tempoRelativo } from "@/lib/nexa/utils";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/painel/")({
  component: VisaoGeral,
});

function VisaoGeral() {
  const { sites, envios, pronto } = useNexa();
  const desempenho = useDesempenho();

  if (!pronto)
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );

  const publicados = sites.filter((s) => s.status === "publicado");
  const rascunhos = sites.filter((s) => s.status === "rascunho");
  const visitas = sites.reduce((total, site) => total + (desempenho[site.id]?.visitas ?? 0), 0);
  const cliques = sites.reduce(
    (total, site) => total + (desempenho[site.id]?.cliquesWhatsapp ?? 0),
    0,
  );
  const solicitacoes = envios.length;

  const visitasPorDia = new Map<string, number>();
  for (const site of sites) {
    for (const registro of desempenho[site.id]?.dias ?? []) {
      visitasPorDia.set(registro.dia, (visitasPorDia.get(registro.dia) ?? 0) + registro.visitas);
    }
  }

  const serie = Array.from({ length: 30 }, (_, i) => {
    const data = new Date();
    data.setDate(data.getDate() - (29 - i));
    const dia = data.toISOString().slice(0, 10);
    return { dia, visitas: visitasPorDia.get(dia) ?? 0 };
  });

  const cards = [
    { r: "Total de clientes", v: numero(sites.length), i: Users },
    { r: "Mini-sites publicados", v: numero(publicados.length), i: Globe },
    { r: "Rascunhos", v: numero(rascunhos.length), i: FileEdit },
    { r: "Visitas no mês", v: numero(visitas), i: ArrowUpRight },
    { r: "Cliques no WhatsApp", v: numero(cliques), i: MessageCircle },
    { r: "Solicitações recebidas", v: numero(solicitacoes), i: ArrowUpRight },
  ];
  const primeiro = sites[0];
  const passosInicio = [
    {
      feito: sites.length > 0,
      texto: "Criar seu primeiro mini-site",
      destino: "/painel/novo" as const,
    },
    {
      feito: Boolean(primeiro?.conteudo.logo),
      texto: "Adicionar logo",
      destino: primeiro ? `/painel/editor/${primeiro.id}` : "/painel/novo",
    },
    {
      feito: Boolean(primeiro?.conteudo.capa),
      texto: "Escolher uma capa",
      destino: primeiro ? `/painel/editor/${primeiro.id}` : "/painel/novo",
    },
    {
      feito: Boolean(primeiro?.conteudo.whatsapp),
      texto: "Informar WhatsApp",
      destino: primeiro ? `/painel/editor/${primeiro.id}` : "/painel/novo",
    },
    {
      feito: publicados.length > 0,
      texto: "Publicar seu site",
      destino: primeiro ? `/painel/editor/${primeiro.id}` : "/painel/novo",
    },
  ];
  const concluidos = passosInicio.filter((passo) => passo.feito).length;

  if (sites.length === 0)
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Visão geral</h1>
          <p className="text-sm text-muted-foreground">
            Assim que o primeiro mini-site existir, os números aparecem aqui.
          </p>
        </div>
        <section className="surface flex flex-col items-start gap-4 p-6 sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime/20">
            <Globe size={22} aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold">Crie seu primeiro mini-site</h2>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              Escolha um modelo pronto do seu segmento ou descreva o negócio e deixe a criação
              automática montar a primeira versão. Visitas, cliques no WhatsApp e solicitações
              passam a ser medidos depois da publicação.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/painel/novo"
              className="inline-flex min-h-11 items-center rounded-xl bg-foreground px-4 text-sm font-semibold text-background"
            >
              Criar mini-site
            </Link>
            <Link
              to="/modelos"
              className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-secondary"
            >
              Ver modelos
            </Link>
          </div>
        </section>
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Visão geral</h1>
        <p className="text-sm text-muted-foreground">Resumo dos mini-sites dos seus clientes.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.r} className="surface p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{c.r}</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <c.i size={15} className="text-muted-foreground" aria-hidden />
              </span>
            </div>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums">{c.v}</p>
          </div>
        ))}
      </div>


      {concluidos < passosInicio.length && (
        <section className="surface p-5" aria-labelledby="checklist-inicial">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="checklist-inicial" className="font-semibold">
                Deixe seu primeiro site pronto
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {concluidos} de {passosInicio.length} etapas concluídas.
              </p>
            </div>
            <span className="rounded-full bg-lime/20 px-3 py-1 text-xs font-bold text-foreground">
              {Math.round((concluidos / passosInicio.length) * 100)}%
            </span>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {passosInicio.map((passo) => (
              <li key={passo.texto}>
                <Link
                  to={passo.destino as "/painel/novo"}
                  className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm hover:bg-secondary"
                >
                  <CheckCircle2
                    size={16}
                    className={passo.feito ? "text-lime" : "text-muted-foreground"}
                    aria-hidden
                  />
                  <span className={passo.feito ? "line-through opacity-60" : "font-medium"}>
                    {passo.texto}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-2">
          <p className="font-semibold">Visitas nos últimos 30 dias</p>
          <div className="mt-4 h-64">
            <GraficoArea
              dados={serie.map((p) => ({ rotulo: p.dia, valor: p.visitas }))}
              ariaLabel="Visitas diárias nos últimos 30 dias"
            />
          </div>
        </div>

        <div className="surface p-5">
          <p className="font-semibold">Atividades recentes</p>
          {sites.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhum registro ainda. As atividades aparecerão aqui quando você criar mini-sites.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {sites.slice(0, 6).map((s) => (
                <li key={s.id}>
                  <Link
                    to="/painel/editor/$id"
                    params={{ id: s.id }}
                    className="flex min-h-11 items-start gap-3 rounded-xl px-2 py-2 hover:bg-secondary"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lime"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{s.conteudo.nome}</span>
                      <span className="block text-xs text-muted-foreground">
                        {s.status === "publicado" ? "Publicado" : "Atualizado"} ·{" "}
                        {tempoRelativo(s.atualizadoEm)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/painel/clientes"
            className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
          >
            Ver todos os clientes
          </Link>
        </div>
      </div>
    </div>
  );
}
