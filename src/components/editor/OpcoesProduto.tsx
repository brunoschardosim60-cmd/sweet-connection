import { uid } from "@/lib/nexa/utils";
import type { GrupoOpcaoProduto } from "@/lib/nexa/types";

export function OpcoesProduto({
  valor,
  onChange,
}: {
  valor: GrupoOpcaoProduto[];
  onChange: (grupos: GrupoOpcaoProduto[]) => void;
}) {
  const atualizar = (id: string, campos: Partial<GrupoOpcaoProduto>) =>
    onChange(valor.map((g) => (g.id === id ? { ...g, ...campos } : g)));
  const input = "mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-2 text-sm";
  return (
    <details className="rounded-xl border border-border p-3">
      <summary className="cursor-pointer text-sm font-semibold">
        Personalizações e adicionais ({valor.length} grupos)
      </summary>
      <p className="my-3 text-xs text-muted-foreground">
        Tamanho, sabor ou adicionais: cada acréscimo soma ao preço base por unidade. Estes grupos
        substituem as variações simples no cardápio.
      </p>
      <div className="space-y-4">
        {valor.map((g) => (
          <fieldset key={g.id} className="space-y-3 rounded-xl border border-border p-3">
            <legend className="px-1 text-xs">Grupo de opções</legend>
            <label className="block text-xs">
              Nome do grupo
              <input
                maxLength={60}
                value={g.nome}
                onChange={(e) => atualizar(g.id, { nome: e.target.value })}
                className={input}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs">
                Mínimo
                <input
                  type="number"
                  min={0}
                  max={g.maximo}
                  value={g.minimo}
                  onChange={(e) =>
                    atualizar(g.id, {
                      minimo: Math.min(
                        g.maximo,
                        Math.max(0, Math.floor(Number(e.target.value) || 0)),
                      ),
                    })
                  }
                  className={input}
                />
              </label>
              <label className="text-xs">
                Máximo
                <input
                  type="number"
                  min={1}
                  max={g.opcoes.length}
                  value={g.maximo}
                  onChange={(e) => {
                    const maximo = Math.min(
                      g.opcoes.length,
                      Math.max(1, Math.floor(Number(e.target.value) || 1)),
                    );
                    atualizar(g.id, { maximo, minimo: Math.min(g.minimo, maximo) });
                  }}
                  className={input}
                />
              </label>
            </div>
            {g.opcoes.map((op) => (
              <div
                key={op.id}
                className="grid grid-cols-[minmax(0,1fr)_100px] gap-2 rounded-lg bg-secondary/40 p-2"
              >
                <label className="text-xs">
                  Opção
                  <input
                    maxLength={80}
                    value={op.nome}
                    onChange={(e) =>
                      atualizar(g.id, {
                        opcoes: g.opcoes.map((o) =>
                          o.id === op.id ? { ...o, nome: e.target.value } : o,
                        ),
                      })
                    }
                    className={input}
                  />
                </label>
                <label className="text-xs">
                  Acréscimo (R$)
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    step="0.01"
                    value={op.acrescimo}
                    onChange={(e) =>
                      atualizar(g.id, {
                        opcoes: g.opcoes.map((o) =>
                          o.id === op.id
                            ? {
                                ...o,
                                acrescimo: Math.min(
                                  100000,
                                  Math.max(
                                    0,
                                    Math.round((Number(e.target.value) || 0) * 100) / 100,
                                  ),
                                ),
                              }
                            : o,
                        ),
                      })
                    }
                    className={input}
                  />
                </label>
                <button
                  type="button"
                  disabled={g.opcoes.length <= 1}
                  className="min-h-11 text-left text-xs text-ember disabled:opacity-40"
                  onClick={() => {
                    const opcoes = g.opcoes.filter((o) => o.id !== op.id);
                    atualizar(g.id, {
                      opcoes,
                      maximo: Math.min(g.maximo, opcoes.length),
                      minimo: Math.min(g.minimo, opcoes.length),
                    });
                  }}
                >
                  Remover opção
                </button>
              </div>
            ))}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={g.opcoes.length >= 20}
                className="min-h-11 text-xs"
                onClick={() =>
                  atualizar(g.id, {
                    opcoes: [
                      ...g.opcoes,
                      { id: uid(), nome: `Opção ${g.opcoes.length + 1}`, acrescimo: 0 },
                    ],
                  })
                }
              >
                + Opção
              </button>
              <button
                type="button"
                className="min-h-11 text-xs text-ember"
                onClick={() => onChange(valor.filter((item) => item.id !== g.id))}
              >
                Remover grupo
              </button>
            </div>
          </fieldset>
        ))}
      </div>
      <button
        type="button"
        disabled={valor.length >= 8}
        className="mt-3 min-h-11 rounded-full border border-border px-4 text-xs"
        onClick={() =>
          onChange([
            ...valor,
            {
              id: uid(),
              nome: "Escolha uma opção",
              minimo: 1,
              maximo: 1,
              opcoes: [{ id: uid(), nome: "Opção 1", acrescimo: 0 }],
            },
          ])
        }
      >
        + Grupo de personalização
      </button>
    </details>
  );
}
