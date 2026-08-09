import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  Image as ImageIcon,
  LayoutGrid,
  Moon,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Sun,
  Users,
  BarChart3,
  Globe,
  LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";

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

const itens = [
  { to: "/painel", rotulo: "Visão geral", icone: LayoutDashboard, exato: true },
  { to: "/painel/clientes", rotulo: "Clientes", icone: Users },
  { to: "/painel/modelos", rotulo: "Modelos", icone: LayoutGrid },
  { to: "/painel/estatisticas", rotulo: "Estatísticas", icone: BarChart3 },
  { to: "/painel/midias", rotulo: "Mídias", icone: ImageIcon },
  { to: "/painel/configuracoes", rotulo: "Configurações", icone: Settings },
] as const;

function PainelLayout() {
  const [recolhida, setRecolhida] = useState(false);
  const [escuro, setEscuro] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const noEditor = pathname.includes("/painel/editor/");

  if (noEditor) return <Outlet />;

  const alternarTema = () => {
    const novo = !escuro;
    setEscuro(novo);
    document.documentElement.classList.toggle("dark", novo);
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground transition-all md:flex ${
          recolhida ? "w-[72px]" : "w-64"
        }`}
      >
        <div className="flex items-center justify-between px-2 py-3">
          {!recolhida && <Logo invertido />}
          <button
            type="button"
            aria-label="Recolher menu"
            onClick={() => setRecolhida((v) => !v)}
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-sidebar-accent"
          >
            <PanelLeft size={16} />
          </button>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {itens.map((i) => {
            const ativo = i.exato ? pathname === i.to : pathname.startsWith(i.to);
            return (
              <Link
                key={i.to}
                to={i.to}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  ativo
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <i.icone size={17} className="shrink-0" />
                {!recolhida && <span className="truncate">{i.rotulo}</span>}
              </Link>
            );
          })}
        </nav>

        <Link
          to="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent"
        >
          <Globe size={17} className="shrink-0" />
          {!recolhida && "Ver landing page"}
        </Link>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-xl sm:flex sm:justify-between">
          <label className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-2 sm:w-80">
            <Search size={15} className="shrink-0 text-muted-foreground" />
            <input
              placeholder="Buscar clientes ou mini-sites"
              onKeyDown={(e) => {
                if (e.key === "Enter") toast("Use a busca na página de Clientes");
              }}
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Notificações"
              onClick={() =>
                toast("3 novidades", {
                  description: "1 novo pedido, 1 agendamento e 1 formulário recebido.",
                })
              }
              className="relative grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-secondary"
            >
              <Bell size={16} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-lime" />
            </button>
            <button
              type="button"
              aria-label="Alternar tema"
              onClick={alternarTema}
              className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-secondary"
            >
              {escuro ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link
              to="/painel/novo"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-ink-foreground"
            >
              <Plus size={15} /> <span className="hidden sm:inline">Criar novo mini-site</span>
            </Link>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime text-sm font-bold text-ink">
              AD
            </span>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
