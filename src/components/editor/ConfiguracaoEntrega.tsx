import type { Comercio } from "@/lib/nexa/types";
import { FUSOS } from "@/lib/nexa/atendimento";

const campo =
  "mt-1 min-h-11 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground";
export function ConfiguracaoEntrega({
  valor,
  alterar,
  enderecoLoja,
}: {
  valor: Comercio;
  alterar: (valor: Comercio) => void;
  enderecoLoja?: string;
}) {
  const patch = (mudanca: Partial<Comercio>) => alterar({ ...valor, ...mudanca });
  return (
    <fieldset className="mt-4 space-y-4 rounded-xl border border-border p-4">
      <legend className="px-2 text-sm font-semibold">Entrega e agendamento</legend>
      <label className="block text-sm">
        Como calcular a entrega?
        <select
          className={campo}
          value={valor.calculoEntrega ?? "fixa"}
          onChange={(e) =>
            patch({ calculoEntrega: e.target.value as NonNullable<Comercio["calculoEntrega"]> })
          }
        >
          <option value="fixa">Taxa fixa (com exceções por bairro)</option>
          <option value="bairro">Somente bairros/regiões cadastrados</option>
          <option value="distancia">Quilômetros pela rota de carro</option>
        </select>
      </label>
      {valor.calculoEntrega === "distancia" && (
        <>
          <label className="block text-sm">
            Endereço de saída das entregas
            <input
              className={campo}
              maxLength={240}
              placeholder="Rua, número, bairro, cidade, UF e CEP"
              value={valor.enderecoOrigem ?? ""}
              onChange={(e) => patch({ enderecoOrigem: e.target.value })}
            />
          </label>
          {enderecoLoja?.trim() && (
            <button
              type="button"
              className="min-h-11 rounded-xl border border-border px-3 text-sm"
              onClick={() => patch({ enderecoOrigem: enderecoLoja.trim().slice(0, 240) })}
            >
              Usar endereço cadastrado da loja
            </button>
          )}
          <p className="text-xs text-muted-foreground">
            Confirme rua, número, cidade e UF da saída. A localização não é detectada
            automaticamente. A distância é calculada pelas ruas no Google Maps. A menor faixa que
            atender a distância define a taxa; fora da última faixa, a entrega é recusada. O cliente
            revisa o valor antes de enviar.
          </p>
          {(valor.faixasDistancia ?? []).map((faixa, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <label className="min-w-0 text-xs">
                Até (km)
                <input
                  className={campo}
                  type="number"
                  min="0.1"
                  max="200"
                  step="0.1"
                  value={faixa.ateKm}
                  onChange={(e) =>
                    patch({
                      faixasDistancia: valor.faixasDistancia!.map((f, j) =>
                        j === i ? { ...f, ateKm: Number(e.target.value) } : f,
                      ),
                    })
                  }
                />
              </label>
              <label className="min-w-0 text-xs">
                Taxa (R$)
                <input
                  className={campo}
                  type="number"
                  min="0"
                  max="100000"
                  step="0.01"
                  value={faixa.taxa}
                  onChange={(e) =>
                    patch({
                      faixasDistancia: valor.faixasDistancia!.map((f, j) =>
                        j === i ? { ...f, taxa: Number(e.target.value) } : f,
                      ),
                    })
                  }
                />
              </label>
              <button
                type="button"
                className="min-h-11 px-2 text-xs text-destructive"
                aria-label={`Remover faixa ${i + 1}`}
                onClick={() =>
                  patch({ faixasDistancia: valor.faixasDistancia!.filter((_, j) => j !== i) })
                }
              >
                Remover
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={(valor.faixasDistancia?.length ?? 0) >= 20}
            className="min-h-11 rounded-xl border border-border px-3 text-sm"
            onClick={() =>
              patch({ faixasDistancia: [...(valor.faixasDistancia ?? []), { ateKm: 5, taxa: 5 }] })
            }
          >
            + Faixa de distância
          </button>
        </>
      )}
      {valor.calculoEntrega === "bairro" && (
        <p className="text-xs text-muted-foreground">
          Cadastre as regiões e seus preços na tabela de bairros. Endereços fora dessa lista não
          terão entrega disponível.
        </p>
      )}
      {valor.calculoEntrega !== "distancia" && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Taxas por bairro / região</h4>
          {(valor.taxasPorBairro ?? []).map((regiao, i) => (
            <div key={i} className="rounded-xl border border-border p-3">
              <div className="grid min-w-0 grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-2">
                <label className="min-w-0 text-xs">
                  Bairro / região
                  <input
                    className={campo}
                    maxLength={120}
                    value={regiao.bairro}
                    placeholder="Centro"
                    onChange={(e) =>
                      patch({
                        taxasPorBairro: valor.taxasPorBairro!.map((r, j) =>
                          j === i ? { ...r, bairro: e.target.value } : r,
                        ),
                      })
                    }
                  />
                </label>
                <label className="min-w-0 text-xs">
                  Taxa (R$)
                  <input
                    className={campo}
                    type="number"
                    min="0"
                    max="100000"
                    step="0.01"
                    value={regiao.taxa}
                    onChange={(e) =>
                      patch({
                        taxasPorBairro: valor.taxasPorBairro!.map((r, j) =>
                          j === i ? { ...r, taxa: Math.max(0, Number(e.target.value)) } : r,
                        ),
                      })
                    }
                  />
                </label>
              </div>
              <button
                type="button"
                className="min-h-11 text-xs text-destructive"
                aria-label={`Remover região ${i + 1}`}
                onClick={() =>
                  patch({ taxasPorBairro: valor.taxasPorBairro!.filter((_, j) => j !== i) })
                }
              >
                Remover região
              </button>
            </div>
          ))}
          <button
            type="button"
            className="min-h-11 rounded-xl border border-border px-3 text-sm"
            disabled={(valor.taxasPorBairro?.length ?? 0) >= 100}
            onClick={() =>
              patch({ taxasPorBairro: [...(valor.taxasPorBairro ?? []), { bairro: "", taxa: 0 }] })
            }
          >
            + Bairro / região
          </button>
        </div>
      )}
      <label className="block text-sm">
        Fuso horário da loja
        <select
          className={campo}
          value={valor.fusoHorario ?? "America/Sao_Paulo"}
          onChange={(e) => patch({ fusoHorario: e.target.value })}
        >
          {FUSOS.map((f) => (
            <option key={f} value={f}>
              {f.replace("America/", "").replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={valor.aceitarAgendamento !== false}
          onChange={(e) => patch({ aceitarAgendamento: e.target.checked })}
        />
        Permitir pedidos agendados
      </label>
      <p className="text-xs text-muted-foreground">
        Fechada, a loja não recebe pedidos imediatos. Se permitido, o cliente escolhe um horário de
        atendimento nos próximos 7 dias, com pelo menos 30 minutos de antecedência. Cadastre os
        horários na seção de contato.
      </p>
    </fieldset>
  );
}
