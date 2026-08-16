import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Image as ImageIcon,
  Inbox,
  LayoutGrid,
  Menu,
  Moon,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Sun,
  Users,
  X,
  BarChart3,
  Globe,
  LayoutDashboard,
  Loader2,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { useNexa } from "@/lib/nexa/hooks";
import { useTema } from "@/lib/nexa/tema";
import { marcaStore } from "@/lib/nexa/marca";
import { analytics } from "@/lib/nexa/analytics";
import { midiaStore } from "@/lib/nexa/media";
import { versaoStore } from "@/lib/nexa/versoes";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useIsAdmin } from "@/lib/nexa/admin";
import { supabase } from "@/integrations/supabase/client";
import { modelos } from "@/lib/nexa/modelos";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Painel — Nexa" },
      { name: "description", content: "Painel administrativo para criar e gerenciar mini-sites." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Painel — Nexa" },
      { property: "og:description", content: "Gerencie clientes, mini-sites e estatísticas." },
    ],
  }),
  component: PainelLayout,
});

const itens: { to: string; rotulo: string; icone: typeof Users; exato?: boolean }[] = [
  { to: "/painel", rotulo: "Visão geral", icone: LayoutDashboard, exato: true },
  { to: "/painel/clientes", rotulo: "Clientes", icone: Users },
  { to: "/painel/solicitacoes", rotulo: "Solicitações", icone: Inbox },
  { to: "/painel/modelos", rotulo: "Modelos", icone: LayoutGrid },
  { to: "/painel/estatisticas", rotulo: "Estatísticas", icone: BarChart3 },
  { to: "/painel/midias", rotulo: "Mídias", icone: ImageIcon },
  { to: "/painel/configuracoes", rotulo: "Configurações", icone: Settings },
];

type ItemBusca = {
  tipo: "site" | "envio" | "modelo";
  id: string;
  titulo: string;
  subtitulo: string;
};
type GrupoBusca = { rotulo: string; itens: ItemBusca[] };

/** Realça a parte do texto que corresponde ao termo buscado. */
function Destacar({ texto, termo }: { texto: string; termo: string }) {
  const inicio = termo ? texto.toLowerCase().indexOf(termo) : -1;
  if (inicio < 0) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, inicio)}
      <mark className="rounded bg-lime px-0.5 text-ink">
        {texto.slice(inicio, inicio + termo.length)}
      </mark>
      {texto.slice(inicio + termo.length)}
    </>
  );
}

function PainelLayout() {
  const navigate = useNavigate();
  const { user, carregando: carregandoSessao } = useAuthSession();
  const [recolhida, setRecolhida] = useState(false);
  const [menuMovel, setMenuMovel] = useState(false);
  const { escuro, alternar } = useTema();
  const { admin } = useIsAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const noEditor = pathname.includes("/painel/editor/");
  const { sites, envios, pronto, erro, store } = useNexa();
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState(-1);
  const opcoesRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const drawerRef = useRef<HTMLDivElement>(null);
  const botaoMenuRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!carregandoSessao && !user) {
      void navigate({ to: "/login", replace: true });
    }
  }, [carregandoSessao, navigate, user]);

  /* Escape fecha o menu móvel, foco entra no drawer e o scroll de fundo trava. */
  useEffect(() => {
    if (!menuMovel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuMovel(false);
        botaoMenuRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = anterior;
    };
  }, [menuMovel]);

  useEffect(() => {
    setMenuMovel(false);
  }, [pathname]);

  if (carregandoSessao) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background" role="status">
        <Loader2 className="animate-spin" aria-hidden="true" />
        <span className="sr-only">Verificando acesso…</span>
      </div>
    );
  }

  if (!user) return null;

  if (noEditor) return <Outlet />;

  const sair = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Não foi possível sair. Tente novamente.");
      return;
    }
    store.reset();
    marcaStore.reset();
    analytics.reset();
    midiaStore.reset();
    versaoStore.reset();
    await navigate({ to: "/login", replace: true });
  };

  const pendentes = pronto ? envios.filter((envio) => envio.status === "novo").length : 0;

  const termo = busca.trim().toLowerCase();
  const grupos: GrupoBusca[] = termo
    ? [
        {
          rotulo: "Mini-sites",
          itens: sites
            .filter((s) =>
              [s.conteudo.nome, s.cliente.empresa, s.cliente.responsavel, s.slug]
                .filter(Boolean)
                .some((v) => v.toLowerCase().includes(termo)),
            )
            .slice(0, 6)
            .map<ItemBusca>((s) => ({
              tipo: "site",
              id: s.id,
              titulo: s.conteudo.nome || s.cliente.empresa || s.slug,
              subtitulo: `/site/${s.slug} · ${s.status}`,
            })),
        },
        {
          rotulo: "Solicitações",
          itens: envios
            .filter((envio) =>
              Object.values(envio.dados).some((valor) => valor.toLowerCase().includes(termo)),
            )
            .slice(0, 3)
            .map<ItemBusca>((envio) => {
              const site = sites.find((item) => item.id === envio.siteId);
              return {
                tipo: "envio",
                id: envio.id,
                titulo:
                  Object.values(envio.dados).find((valor) => valor.toLowerCase().includes(termo)) ??
                  "Solicitação",
                subtitulo: site?.conteudo.nome || site?.slug || "Mini-site removido",
              };
            }),
        },
        {
          rotulo: "Modelos",
          itens: modelos
            .filter((modelo) =>
              [modelo.nome, modelo.descricao, modelo.destaque].some((valor) =>
                valor.toLowerCase().includes(termo),
              ),
            )
            .slice(0, 3)
            .map<ItemBusca>((modelo) => ({
              tipo: "modelo",
              id: modelo.id,
              titulo: modelo.nome,
              subtitulo: modelo.destaque,
            })),
        },
      ].filter((g) => g.itens.length > 0)
    : [];
  const planos = grupos.flatMap((g) => g.itens);
  const temResultados = planos.length > 0;
  const carregandoBusca = termo.length > 0 && !pronto;

  const fecharBusca = () => {
    setBusca("");
    setAtivo(-1);
  };

  const aoTeclarBusca = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      fecharBusca();
      return;
    }
    if (!temResultados) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAtivo((v) => (v + 1) % planos.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((v) => (v <= 0 ? planos.length - 1 : v - 1));
    } else if (e.key === "Enter" && ativo >= 0) {
      e.preventDefault();
      opcoesRef.current[ativo]?.click();
    }
  };

  const navegacao = admin
    ? [...itens, { to: "/painel/admin", rotulo: "Administração", icone: ShieldCheck }]
    : itens;

  const ativoDe = (i: (typeof itens)[number]) =>
    i.exato ? pathname === i.to : pathname.startsWith(i.to);

  const linkClasse = (ativo: boolean) =>
    `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
      ativo
        ? "bg-sidebar-primary text-sidebar-primary-foreground"
        : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    }`;

  return (
    <div className="flex min-h-dvh w-full bg-background">
      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground transition-all md:flex ${
          recolhida ? "w-[72px]" : "w-64"
        }`}
      >
        <div className="flex items-center justify-between px-2 py-3">
          {!recolhida && <Logo invertido />}
          <button
            type="button"
            aria-label={recolhida ? "Expandir menu lateral" : "Recolher menu lateral"}
            aria-pressed={recolhida}
            onClick={() => setRecolhida((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-lg hover:bg-sidebar-accent"
          >
            <PanelLeft size={16} />
          </button>
        </div>

        <nav aria-label="Navegação do painel" className="mt-4 flex flex-1 flex-col gap-1">
          {navegacao.map((i) => {
            const ativo = ativoDe(i);
            return (
              <Link
                key={i.to}
                to={i.to}
                aria-current={ativo ? "page" : undefined}
                title={recolhida ? i.rotulo : undefined}
                className={linkClasse(ativo)}
              >
                <i.icone size={17} className="shrink-0" />
                {!recolhida && <span className="truncate">{i.rotulo}</span>}
              </Link>
            );
          })}
        </nav>

        <Link
          to="/"
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent"
        >
          <Globe size={17} className="shrink-0" />
          {!recolhida && "Ver landing page"}
        </Link>
        <button
          type="button"
          onClick={() => void sair()}
          title={recolhida ? "Sair" : undefined}
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent"
        >
          <LogOut size={17} className="shrink-0" />
          {!recolhida && "Sair"}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border bg-background/90 px-3 py-3 backdrop-blur-xl sm:gap-3 sm:px-4 md:flex md:justify-between">
          <button
            ref={botaoMenuRef}
            type="button"
            aria-label="Abrir menu de navegação"
            aria-expanded={menuMovel}
            aria-controls="menu-painel-movel"
            onClick={() => setMenuMovel(true)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border hover:bg-secondary md:hidden"
          >
            <Menu size={18} />
          </button>

          <div className="relative min-w-0 md:w-80">
            <label className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-2">
              <Search size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Buscar mini-sites, solicitações ou modelos</span>
              <input
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setAtivo(-1);
                }}
                onKeyDown={aoTeclarBusca}
                role="combobox"
                aria-expanded={temResultados}
                aria-controls="resultados-busca-painel"
                aria-autocomplete="list"
                aria-activedescendant={ativo >= 0 ? `busca-opcao-${ativo}` : undefined}
                placeholder="Buscar mini-sites, solicitações ou modelos"
                className="w-full bg-transparent text-sm outline-none"
              />
            </label>
            {termo.length > 0 && (
              <div
                id="resultados-busca-painel"
                className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card shadow-lg"
              >
                {carregandoBusca ? (
                  <p
                    role="status"
                    className="flex min-h-11 items-center gap-2 px-4 py-3 text-sm text-muted-foreground"
                  >
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Carregando
                    seus dados…
                  </p>
                ) : !temResultados ? (
                  <div className="px-4 py-4">
                    <p className="text-sm font-semibold">Nada encontrado</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Nenhum mini-site, solicitação ou modelo corresponde a “{busca.trim()}”.
                    </p>
                  </div>
                ) : (
                  <ul role="listbox" aria-label="Resultados da busca" className="py-1">
                    {grupos.map((grupo) => (
                      <li key={grupo.rotulo} role="presentation">
                        <p
                          role="presentation"
                          className="px-4 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
                        >
                          {grupo.rotulo}
                        </p>
                        <ul role="group" aria-label={grupo.rotulo}>
                          {grupo.itens.map((item) => {
                            const indice = planos.indexOf(item);
                            const selecionado = indice === ativo;
                            const comum = {
                              id: `busca-opcao-${indice}`,
                              role: "option" as const,
                              "aria-selected": selecionado,
                              ref: (el: HTMLAnchorElement | null) => {
                                opcoesRef.current[indice] = el;
                              },
                              onClick: fecharBusca,
                              onMouseEnter: () => setAtivo(indice),
                              className: `flex min-h-11 flex-col justify-center px-4 py-2 ${
                                selecionado ? "bg-secondary" : "hover:bg-secondary"
                              }`,
                            };
                            const conteudo = (
                              <>
                                <span className="truncate text-sm font-medium">
                                  <Destacar texto={item.titulo} termo={termo} />
                                </span>
                                <span className="truncate text-xs text-muted-foreground">
                                  <Destacar texto={item.subtitulo} termo={termo} />
                                </span>
                              </>
                            );
                            return (
                              <li key={`${item.tipo}:${item.id}`}>
                                {item.tipo === "site" ? (
                                  <Link to="/painel/editor/$id" params={{ id: item.id }} {...comum}>
                                    {conteudo}
                                  </Link>
                                ) : item.tipo === "modelo" ? (
                                  <Link
                                    to="/demonstracao/$modelo"
                                    params={{ modelo: item.id }}
                                    {...comum}
                                  >
                                    {conteudo}
                                  </Link>
                                ) : (
                                  <Link to="/painel/solicitacoes" {...comum}>
                                    {conteudo}
                                  </Link>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  to="/painel/novo"
                  onClick={fecharBusca}
                  className="flex min-h-11 items-center gap-2 border-t border-border px-4 text-sm font-semibold hover:bg-secondary"
                >
                  <Plus size={14} /> Criar novo mini-site
                </Link>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/painel/solicitacoes"
              aria-label={
                pendentes > 0
                  ? `Solicitações: ${pendentes} recebidas`
                  : "Solicitações: nenhuma novidade"
              }
              className="relative hidden h-11 w-11 place-items-center rounded-full border border-border hover:bg-secondary sm:grid"
            >
              <Bell size={16} />
              {pendentes > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-lime" />
              )}
            </Link>
            <button
              type="button"
              aria-label={escuro ? "Ativar tema claro" : "Ativar tema escuro"}
              aria-pressed={escuro}
              onClick={alternar}
              className="grid h-11 w-11 place-items-center rounded-full border border-border hover:bg-secondary"
            >
              {escuro ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link
              to="/painel/novo"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-ink-foreground"
            >
              <Plus size={15} /> <span className="hidden lg:inline">Criar novo mini-site</span>
              <span className="sr-only lg:hidden">Criar novo mini-site</span>
            </Link>
            <span
              aria-hidden="true"
              className="hidden h-9 w-9 shrink-0 place-items-center rounded-full bg-lime text-sm font-bold text-ink sm:grid"
            >
              AD
            </span>
          </div>
        </header>

        {menuMovel && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Fechar menu de navegação"
              onClick={() => setMenuMovel(false)}
              className="absolute inset-0 h-full w-full cursor-default bg-ink/60"
            />
            <div
              ref={drawerRef}
              id="menu-painel-movel"
              role="dialog"
              aria-modal="true"
              aria-label="Menu de navegação"
              className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground"
            >
              <div className="flex items-center justify-between px-2 py-3">
                <Logo invertido />
                <button
                  type="button"
                  aria-label="Fechar menu de navegação"
                  onClick={() => setMenuMovel(false)}
                  className="grid h-11 w-11 place-items-center rounded-lg hover:bg-sidebar-accent"
                >
                  <X size={18} />
                </button>
              </div>

              <nav aria-label="Navegação do painel" className="mt-2 flex flex-1 flex-col gap-1">
                {navegacao.map((i) => {
                  const ativo = ativoDe(i);
                  return (
                    <Link
                      key={i.to}
                      to={i.to}
                      aria-current={ativo ? "page" : undefined}
                      onClick={() => setMenuMovel(false)}
                      className={linkClasse(ativo)}
                    >
                      <i.icone size={17} className="shrink-0" />
                      <span className="truncate">{i.rotulo}</span>
                    </Link>
                  );
                })}
              </nav>

              <Link
                to="/"
                onClick={() => setMenuMovel(false)}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent"
              >
                <Globe size={17} className="shrink-0" />
                Ver landing page
              </Link>
              <button
                type="button"
                onClick={() => void sair()}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent"
              >
                <LogOut size={17} className="shrink-0" />
                Sair
              </button>
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          {erro && (
            <p role="alert" className="mb-4 rounded-xl border border-destructive/40 p-3 text-sm">
              Não foi possível carregar os dados: {erro}
            </p>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
