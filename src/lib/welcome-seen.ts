export const WELCOME_SEEN_KEY = "welcome-seen";

type ReadableStore = { getItem(key: string): string | null };
type WritableStore = { setItem(key: string, value: string): void };

export function readWelcomeSeen(storage?: ReadableStore | null): boolean {
  if (storage === null) return true;
  const store =
    storage ??
    (typeof localStorage === "undefined" ? null : localStorage);
  if (!store) return true;
  try {
    return store.getItem(WELCOME_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function markWelcomeSeen(storage?: WritableStore): void {
  try {
    const store = storage ?? localStorage;
    store.setItem(WELCOME_SEEN_KEY, "1");
  } catch {
    // localStorage can be blocked
  }
}