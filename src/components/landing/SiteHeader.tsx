import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { brand } from "@/lib/nexa/brand";
import { Logo } from "@/components/Logo";
import { useAuthSession } from "@/hooks/use-auth-session";

const itens = [
  { rotulo: "Recursos", href: "/#recursos" },
  { rotulo: "Modelos", to: "/modelos" },
  { rotulo: "Planos", href: "/#planos" },
  { rotulo: "Dúvidas", href: "/#duvidas" },
];

export function SiteHeader() {
  const { user } = useAuthSession();
  const [aberto, setAberto] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAberto(false);
        botaoRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    menuRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [aberto]);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? "border-b border-border/70 bg-background/85 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 md:flex md:justify-between">
        <Link
          to="/"
          aria-label="Página inicial"
          className="flex min-h-11 min-w-0 items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <Logo />
        </Link>

        <nav aria-label="Navegação principal" className="hidden items-center gap-7 md:flex">
          {itens.map((i) =>
            i.to ? (
              <Link
                key={i.rotulo}
                to={i.to}
                className="inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {i.rotulo}
              </Link>
            ) : (
              <a
                key={i.rotulo}
                href={i.href}
                className="inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {i.rotulo}
              </a>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/painel"
            className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-medium transition-colors hover:bg-secondary"
          >
            {user ? "Voltar ao painel" : "Painel"}
          </Link>
          <Link
            to="/modelos"
            className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-semibold text-ink-foreground transition-transform hover:-translate-y-0.5"
          >
            Conhecer os modelos
          </Link>
        </div>

        <button
          ref={botaoRef}
          type="button"
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={aberto}
          aria-controls="menu-landing-movel"
          onClick={() => setAberto((v) => !v)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border md:hidden"
        >
          {aberto ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {aberto && (
        <div
          ref={menuRef}
          id="menu-landing-movel"
          className="border-t border-border bg-background px-5 py-4 md:hidden"
        >
          <nav aria-label="Navegação principal" className="flex flex-col gap-1">
            {itens.map((i) =>
              i.to ? (
                <Link
                  key={i.rotulo}
                  to={i.to}
                  onClick={() => setAberto(false)}
                  className="flex min-h-11 items-center text-sm font-medium"
                >
                  {i.rotulo}
                </Link>
              ) : (
                <a
                  key={i.rotulo}
                  href={i.href}
                  onClick={() => setAberto(false)}
                  className="flex min-h-11 items-center text-sm font-medium"
                >
                  {i.rotulo}
                </a>
              ),
            )}
            <Link
              to="/painel"
              onClick={() => setAberto(false)}
              className="mt-2 flex min-h-11 items-center justify-center rounded-full bg-ink px-4 text-center text-sm font-semibold text-ink-foreground"
            >
              {user ? "Voltar ao painel" : `Abrir painel do ${brand.nome}`}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
