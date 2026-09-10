import { createHash, createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { criarSessaoIA, validarSessaoIA } from "@/lib/nexa/ia-sessao.server";

const owner = "99999999-0000-4000-8000-000000000001";
const outroOwner = "99999999-0000-4000-8000-000000000002";
const hash = createHash("sha256").update("Briefing do negócio de teste").digest("hex");
const outroHash = createHash("sha256").update("Outro negócio").digest("hex");
const secret = "segredo-exclusivo-de-teste-sem-valor-em-producao";
const agora = Date.UTC(2026, 8, 10, 12);
const duracao = 24 * 60 * 60 * 1000;

function assinarTeste(valor: unknown) {
  const payload = Buffer.from(JSON.stringify(valor)).toString("base64url");
  const mac = createHmac("sha256", secret)
    .update(`nexa-ia-sessao:v1:${payload}`)
    .digest("base64url");
  return `${payload}.${mac}`;
}

describe("sessão autenticada de ajustes da IA", () => {
  it("gera identificador UUID exclusivo e expiração em 24 horas", () => {
    const token = criarSessaoIA(owner, hash, secret, agora);
    const sessao = validarSessaoIA(token, owner, hash, secret, agora);
    expect(sessao).toEqual({
      id: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      ),
      expira: agora + duracao,
    });
    expect(token.length).toBeLessThanOrEqual(2000);
    expect(token).not.toContain(secret);
    expect(
      validarSessaoIA(criarSessaoIA(owner, hash, secret, agora), owner, hash, secret, agora)?.id,
    ).not.toBe(sessao?.id);
  });

  it("usa Date.now quando o instante não é informado", () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(agora);
    try {
      const token = criarSessaoIA(owner, hash, secret);
      expect(validarSessaoIA(token, owner, hash, secret)?.expira).toBe(agora + duracao);
    } finally {
      clock.mockRestore();
    }
  });

  it("recusa outro proprietário, briefing ou segredo", () => {
    const token = criarSessaoIA(owner, hash, secret, agora);
    expect(validarSessaoIA(token, outroOwner, hash, secret, agora)).toBeNull();
    expect(validarSessaoIA(token, owner, outroHash, secret, agora)).toBeNull();
    expect(validarSessaoIA(token, owner, hash, `${secret}-alterado`, agora)).toBeNull();
  });

  it("não permite adulterar o proprietário ou a assinatura", () => {
    const token = criarSessaoIA(owner, hash, secret, agora);
    const [payload, mac] = token.split(".");
    const dados = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const adulterado = Buffer.from(JSON.stringify({ ...dados, owner: outroOwner })).toString(
      "base64url",
    );
    expect(validarSessaoIA(`${adulterado}.${mac}`, outroOwner, hash, secret, agora)).toBeNull();
    const macAdulterado = `${mac[0] === "A" ? "B" : "A"}${mac.slice(1)}`;
    expect(validarSessaoIA(`${payload}.${macAdulterado}`, owner, hash, secret, agora)).toBeNull();
  });

  it("vence exatamente em 24 horas e não é válida antes da emissão", () => {
    const token = criarSessaoIA(owner, hash, secret, agora);
    expect(validarSessaoIA(token, owner, hash, secret, agora + duracao - 1)).not.toBeNull();
    expect(validarSessaoIA(token, owner, hash, secret, agora + duracao)).toBeNull();
    expect(validarSessaoIA(token, owner, hash, secret, agora + duracao + 1)).toBeNull();
    expect(validarSessaoIA(token, owner, hash, secret, agora - 1)).toBeNull();
  });

  it.each(["", "sem-assinatura", "e30.A", "e30.A.B", "a".repeat(2001), null, undefined, 9])(
    "recusa token malformado sem lançar exceção (%s)",
    (token) => {
      expect(validarSessaoIA(token as string, owner, hash, secret, agora)).toBeNull();
    },
  );

  it("recusa dados inválidos mesmo quando o conteúdo está assinado", () => {
    const dados = {
      v: 1,
      id: "99999999-0000-4000-8000-000000000099",
      owner,
      briefingHash: hash,
      emitida: agora,
      expira: agora + duracao,
    };
    for (const valor of [
      null,
      [],
      {},
      { ...dados, v: 2 },
      { ...dados, id: "invalido" },
      { ...dados, expira: dados.expira + 1 },
      { ...dados, emitida: "2026-09-10" },
    ]) {
      expect(validarSessaoIA(assinarTeste(valor), owner, hash, secret, agora)).toBeNull();
    }
  });

  it("falha de modo fechado quando parâmetros de configuração são inválidos", () => {
    const token = criarSessaoIA(owner, hash, secret, agora);
    const casos: [string, string, string, number][] = [
      ["", hash, secret, agora],
      ["id-invalido", hash, secret, agora],
      [owner, "", secret, agora],
      [owner, "nao-e-hash", secret, agora],
      [owner, hash, "curto", agora],
      [owner, hash, " ".repeat(32), agora],
      [owner, hash, "a".repeat(8193), agora],
      [owner, hash, secret, Number.NaN],
      [owner, hash, secret, Number.POSITIVE_INFINITY],
      [owner, hash, secret, -1],
      [owner, hash, secret, agora + 0.5],
      [owner, hash, secret, Number.MAX_SAFE_INTEGER],
    ];
    for (const parametros of casos) {
      expect(() => criarSessaoIA(...parametros)).toThrow("Não foi possível iniciar");
      expect(validarSessaoIA(token, ...parametros)).toBeNull();
    }
  });
});
