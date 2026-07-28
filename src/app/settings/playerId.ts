/** localStorage key for anonymous browser player id (directive §12.1). */
export const PLAYER_ID_STORAGE_KEY = "gnfl.playerId";

/**
 * Return stable anonymous player id for this browser profile.
 * Creates and stores a UUID on first call. Not a real account.
 */
export function getOrCreatePlayerId(
  storage: Pick<Storage, "getItem" | "setItem"> = localStorage,
  createId: () => string = () => crypto.randomUUID(),
): string {
  const existing = storage.getItem(PLAYER_ID_STORAGE_KEY);
  if (existing != null && existing.length > 0) {
    return existing;
  }
  const id = createId();
  storage.setItem(PLAYER_ID_STORAGE_KEY, id);
  return id;
}
