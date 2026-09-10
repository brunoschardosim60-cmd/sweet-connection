import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const DURACAO_SESSAO = 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/i;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

type SessaoIA = {
  v: 1;
  id: string;
  owner: string;
  briefingHash: string;
  emitida: number;
  expira: number;
};

function parametrosValidos(ownerId: string, briefingHash: string, secret: string, agora: number) {
  return (
    typeof ownerId === "string" &&
    UUID.test(ownerId) &&
    typeof briefingHash === "string" &&
    HASH.test(briefingHash) &&
    typeof secret === "string" &&
    secret.trim().length >= 32 &&
    secret.length <= 8192 &&
    Number.isSafeInteger(agora) &&
    agora >= 0 &&
    agora <= Number.MAX_SAFE_INTEGER - DURACAO_SESSAO
  );
}

function assinatura(payload: string, secret: string) {
  return createHmac("sha256", secret).update(`nexa-ia-sessao:v1:${payload}`).digest();
}

/** Credencial de ajustes do mesmo briefing; o limite de uso é aplicado no servidor. */
export function criarSessaoIA(
  ownerId: string,
  briefingHash: string,
  secret: string,
  agora = Date.now(),
): string {
  if (!parametrosValidos(ownerId, briefingHash, secret, agora)) {
    throw new Error("Não foi possível iniciar a sessão de ajustes.");
  }
  const sessao: SessaoIA = {
    v: 1,
    id: randomUUID(),
    owner: ownerId,
    briefingHash,
    emitida: agora,
    expira: agora + DURACAO_SESSAO,
  };
  const payload = Buffer.from(JSON.stringify(sessao)).toString("base64url");
  return `${payload}.${assinatura(payload, secret).toString("base64url")}`;
}

export function validarSessaoIA(
  token: string,
  ownerId: string,
  briefingHash: string,
  secret: string,
  agora = Date.now(),
): { id: string; expira: number } | null {
  if (
    !parametrosValidos(ownerId, briefingHash, secret, agora) ||
    typeof token !== "string" ||
    token.length > 2000
  ) {
    return null;
  }
  try {
    const partes = token.split(".");
    if (partes.length !== 2) return null;
    const [payload, mac] = partes;
    if (!payload || !mac) return null;
    if (!BASE64URL.test(payload) || !/^[A-Za-z0-9_-]{43}$/.test(mac)) return null;
    const recebida = Buffer.from(mac, "base64url");
    const esperada = assinatura(payload, secret);
    if (
      recebida.length !== esperada.length ||
      recebida.toString("base64url") !== mac ||
      !timingSafeEqual(recebida, esperada)
    ) {
      return null;
    }
    const dados = Buffer.from(payload, "base64url");
    if (dados.toString("base64url") !== payload) return null;
    const sessao: unknown = JSON.parse(dados.toString("utf8"));
    if (!sessao || typeof sessao !== "object" || Array.isArray(sessao)) return null;
    const s = sessao as Partial<SessaoIA>;
    if (
      s.v !== 1 ||
      typeof s.id !== "string" ||
      !UUID.test(s.id) ||
      s.owner !== ownerId ||
      s.briefingHash !== briefingHash ||
      typeof s.emitida !== "number" ||
      !Number.isSafeInteger(s.emitida) ||
      s.emitida < 0 ||
      s.emitida > agora ||
      typeof s.expira !== "number" ||
      !Number.isSafeInteger(s.expira) ||
      s.expira !== s.emitida + DURACAO_SESSAO ||
      agora >= s.expira
    ) {
      return null;
    }
    return { id: s.id, expira: s.expira };
  } catch {
    return null;
  }
}
