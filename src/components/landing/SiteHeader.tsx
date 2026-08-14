import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useMarca } from "@/lib/nexa/hooks";
import { Logo } from "@/components/Logo";

const itens = [
  { rotulo: "Recursos", href: "/#recursos" },
  { rotulo: "Modelos", to: "/modelos" },
  { rotulo: "Planos", href: "/#planos" },
  { rotulo: "Dúvidas", href: "/#duvidas" },
];

export function SiteHeader() {
  const marca = useMarca();
  const [aberto, setAberto] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? "border-b border-border/70 bg-background/85 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 md:flex md:justify-between">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {itens.map((i) =>
            i.to ? (
              <Link
                key={i.rotulo}
                to={i.to}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {i.rotulo}
              </Link>
            ) : (
              <a
                key={i.rotulo}
                href={i.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {i.rotulo}
              </a>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/painel"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
          >
            Painel
          </Link>
          <Link
            to="/modelos"
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-ink-foreground transition-transform hover:-translate-y-0.5"
          >
            Conhecer os modelos
          </Link>
        </div>

        <button
          type="button"
          aria-label="Abrir menu"
          onClick={() => setAberto((v) => !v)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border md:hidden"
        >
          {aberto ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {aberto && (
        <div className="border-t border-border bg-background px-5 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {itens.map((i) =>
              i.to ? (
                <Link key={i.rotulo} to={i.to} onClick={() => setAberto(false)} className="text-sm font-medium">
                  {i.rotulo}
                </Link>
              ) : (
                <a key={i.rotulo} href={i.href} onClick={() => setAberto(false)} className="text-sm font-medium">
                  {i.rotulo}
                </a>
              ),
            )}
            <Link
              to="/painel"
              onClick={() => setAberto(false)}
              className="mt-2 rounded-full bg-ink px-4 py-2.5 text-center text-sm font-semibold text-ink-foreground"
            >
              Abrir painel do {marca.nome}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
