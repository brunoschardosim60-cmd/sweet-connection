import { brand } from "@/lib/nexa/brand";

export function Logo({ invertido = false }: { invertido?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className={`grid h-8 w-8 place-items-center rounded-[10px] ${
          invertido ? "bg-lime text-ink" : "bg-ink text-lime"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <path
            d="M5 19V5l14 14V5"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span
        className={`font-display text-lg font-bold tracking-tight ${invertido ? "text-ink-foreground" : ""}`}
      >
        {brand.nome}
      </span>
    </span>
  );
}
