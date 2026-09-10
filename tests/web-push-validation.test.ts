import { expect, it } from "vitest";
import { endpointPushSeguro } from "@/lib/nexa/push-validation";
it("aceita apenas provedores de push HTTPS conhecidos", () => {
  expect(endpointPushSeguro("https://fcm.googleapis.com/fcm/send/test")).toBe(true);
  expect(endpointPushSeguro("https://updates.push.services.mozilla.com/wpush/test")).toBe(true);
  for (const url of [
    "http://fcm.googleapis.com/x",
    "https://fcm.googleapis.com.attacker.test/x",
    "https://127.0.0.1/x",
    "https://fcm.googleapis.com:444/x",
    "https://user@fcm.googleapis.com/x",
    "file:///etc/passwd",
  ])
    expect(endpointPushSeguro(url)).toBe(false);
});
