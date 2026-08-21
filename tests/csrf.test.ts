import { describe, expect, it } from "vitest";
import { requisicaoCsrfPermitida } from "@/lib/csrf";

const url = "https://nexa.example/api/server-fn";

function request(headers: HeadersInit) {
  return new Request(url, { method: "POST", headers });
}

describe("proteção CSRF", () => {
  it("aceita server functions com origem comprovadamente igual", () => {
    expect(requisicaoCsrfPermitida(request({ "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(requisicaoCsrfPermitida(request({ origin: "https://nexa.example" }))).toBe(true);
    expect(requisicaoCsrfPermitida(request({ referer: "https://nexa.example/painel" }))).toBe(true);
  });

  it("recusa origens cruzadas ou ausentes", () => {
    expect(requisicaoCsrfPermitida(request({ "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(requisicaoCsrfPermitida(request({ origin: "https://atacante.example" }))).toBe(false);
    expect(requisicaoCsrfPermitida(request({}))).toBe(false);
  });
});
