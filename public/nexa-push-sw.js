// Notifications only: no fetch handler, app cache or offline checkout.
self.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }
  const url =
    typeof data.url === "string" && /^\/operacao\?site=[\da-f-]{36}$/i.test(data.url)
      ? data.url
      : "/operacao";
  event.waitUntil(
    self.registration.showNotification("Nexa — novo atendimento", {
      body: "Há um novo atendimento. Abra a operação da loja para conferir.",
      tag: typeof data.tag === "string" ? data.tag.slice(0, 80) : "nexa-atendimento",
      data: { url },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.url;
  const url =
    typeof path === "string" && /^\/operacao\?site=[\da-f-]{36}$/i.test(path) ? path : "/operacao";
  event.waitUntil(self.clients.openWindow(url));
});
