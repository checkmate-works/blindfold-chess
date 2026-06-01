/**
 * Client-side store for shared-game manage tokens.
 *
 * When an account-less author publishes a game, the server returns a one-time
 * manage token (the only handle to later unpublish / delete / claim it). We
 * keep it in localStorage keyed by the published game id so the author can
 * manage their games from the same browser without an account, and present it
 * for "claim" on later sign-up.
 *
 * Browser-only: every function no-ops / returns empty under SSR (`window`
 * guard), so it is safe to import anywhere but only does work client-side.
 */
const STORAGE_KEY = 'blindfold_chess_published_tokens';

type TokenMap = Record<string, string>;

function read(): TokenMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as TokenMap) : {};
  } catch {
    return {};
  }
}

/** Persist the manage token for a freshly published (account-less) game. */
export function storePublishedToken(publishedGameId: string, token: string): void {
  if (typeof window === 'undefined') return;
  const map = read();
  map[publishedGameId] = token;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Storage full / disabled — the author simply loses self-service control,
    // which is the accepted account-less fallback.
  }
}

/** The manage token for a published game id, or null if this browser has none. */
export function getPublishedToken(publishedGameId: string): string | null {
  return read()[publishedGameId] ?? null;
}

/** All published game ids this browser holds a token for (for a future "my games" view). */
export function getPublishedGameIds(): string[] {
  return Object.keys(read());
}

/** Forget a token (e.g. after the game is claimed by an account or deleted). */
export function removePublishedToken(publishedGameId: string): void {
  if (typeof window === 'undefined') return;
  const map = read();
  if (!(publishedGameId in map)) return;
  delete map[publishedGameId];
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}
