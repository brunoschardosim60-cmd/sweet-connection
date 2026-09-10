/**
 * O SDK usa storageKey também como nome do BroadcastChannel. sessionStorage
 * sozinho não isola seus eventos: um login em outra aba notificava esta UI.
 * Cada documento ganha seu canal, enquanto o adaptador mantém os dados na
 * chave estável da própria aba (incluindo PKCE), preservando reload e callbacks.
 */
export function sessaoDaAba(storage: Storage | undefined, chave: string, id: string) {
  if (!storage) return { storageKey: chave };
  const storageKey = `${chave}-document-${id}`;
  const chavePersistida = (key: string) =>
    key.startsWith(storageKey) ? `${chave}${key.slice(storageKey.length)}` : key;
  return {
    storageKey,
    storage: {
      getItem: (key: string) => storage.getItem(chavePersistida(key)),
      setItem: (key: string, value: string) => storage.setItem(chavePersistida(key), value),
      removeItem: (key: string) => storage.removeItem(chavePersistida(key)),
    },
  };
}
