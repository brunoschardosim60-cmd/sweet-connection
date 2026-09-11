/**
 * O SDK usa storageKey também como nome do BroadcastChannel. sessionStorage
 * sozinho não isola seus eventos: um login em outra aba notificava esta UI.
 * Cada documento ganha seu canal, enquanto o adaptador mantém os dados na
 * chave estável da própria aba (incluindo PKCE), preservando reload e callbacks.
 */
export function sessaoDaAba(
  storage: Storage | undefined,
  chave: string,
  id: string,
  dispositivo?: Storage,
) {
  if (!storage) return { storageKey: chave };
  const lembrada = `${chave}-remembered`;
  const vinculo = `${chave}-remember-binding`;
  const saiu = `${chave}-no-restore`;
  type Registro = { id: string; value: string; expiresAt: number };
  const usuario = (value: string | null) => {
    try {
      const userId = JSON.parse(value ?? "null")?.user?.id;
      return typeof userId === "string" ? userId : null;
    } catch {
      return null;
    }
  };
  const ler = (): Registro | null => {
    try {
      const record = JSON.parse(dispositivo?.getItem(lembrada) ?? "null");
      return record &&
        typeof record.id === "string" &&
        typeof record.value === "string" &&
        typeof record.expiresAt === "number" &&
        record.expiresAt > Date.now() &&
        usuario(record.value)
        ? record
        : null;
    } catch {
      return null;
    }
  };
  // Only a new, empty tab may restore. Existing tabs never switch accounts.
  const anterior = ler();
  if (!storage.getItem(chave) && !storage.getItem(saiu) && anterior) {
    storage.setItem(chave, anterior.value);
    storage.setItem(vinculo, anterior.id);
  }
  const vinculado = (record: Registro | null) =>
    record &&
    record.id === storage.getItem(vinculo) &&
    usuario(record.value) === usuario(storage.getItem(chave));
  const esquecer = () => {
    const record = ler();
    if (vinculado(record)) {
      try {
        dispositivo?.removeItem(lembrada);
      } catch {
        /* Storage may be blocked. */
      }
    }
    storage.removeItem(vinculo);
    storage.setItem(saiu, "1");
  };
  const storageKey = `${chave}-document-${id}`;
  const chavePersistida = (key: string) =>
    key.startsWith(storageKey) ? `${chave}${key.slice(storageKey.length)}` : key;
  return {
    storageKey,
    lembrar: (enabled: boolean) => {
      if (!enabled) {
        esquecer();
        return true;
      }
      const value = storage.getItem(chave);
      if (!value || !usuario(value) || !dispositivo) return false;
      const record: Registro = {
        id: crypto.randomUUID(),
        value,
        expiresAt: Date.now() + 30 * 86400000,
      };
      try {
        dispositivo.setItem(lembrada, JSON.stringify(record));
        storage.setItem(vinculo, record.id);
        storage.removeItem(saiu);
        return true;
      } catch {
        return false;
      }
    },
    storage: {
      getItem: (key: string) => {
        const destino = chavePersistida(key);
        const record = destino === chave ? ler() : null;
        if (vinculado(record) && record) storage.setItem(chave, record.value);
        return storage.getItem(destino);
      },
      setItem: (key: string, value: string) => {
        const destino = chavePersistida(key);
        const record = destino === chave ? ler() : null;
        const renovar = vinculado(record) && usuario(record?.value ?? null) === usuario(value);
        if (destino === chave && usuario(storage.getItem(chave)) !== usuario(value))
          storage.removeItem(vinculo);
        storage.setItem(destino, value);
        if (renovar && record) {
          try {
            dispositivo?.setItem(lembrada, JSON.stringify({ ...record, value }));
          } catch {
            /* Keep the current tab signed in if persistent storage becomes unavailable. */
          }
        }
      },
      removeItem: (key: string) => {
        const destino = chavePersistida(key);
        if (destino === chave) esquecer();
        storage.removeItem(destino);
      },
    },
  };
}
