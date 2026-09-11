type PermissaoNativa = {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
};

export const AVISOS_BLOQUEADOS =
  "As notificações estão bloqueadas no navegador. No ícone ao lado do endereço, abra Configurações do site, permita Notificações e tente novamente.";
export const AVISOS_SEM_ESCOLHA =
  "A permissão ainda não foi concedida. Clique em Ativar avisos novamente e escolha Permitir no pedido do navegador. Se o pedido estiver recolhido, procure o ícone de notificações ao lado do endereço.";

/** Must be called directly from the button gesture, before any network request. */
export async function pedirPermissaoDosAvisos(api: PermissaoNativa): Promise<void> {
  if (api.permission === "granted") return;
  if (api.permission === "denied") throw new Error(AVISOS_BLOQUEADOS);
  const resultado = await api.requestPermission();
  if (resultado === "denied") throw new Error(AVISOS_BLOQUEADOS);
  if (resultado !== "granted") throw new Error(AVISOS_SEM_ESCOLHA);
}
