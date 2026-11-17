/**
 * The viewer's last choice on the moves panels' "Include moves" switch for
 * Lichess analysis, remembered per browser so someone who only ever wants
 * the bare position does not have to flip it on every screen.
 *
 * A per-viewer convenience, so browser storage is enough — and it may be
 * missing: a private window or blocked site data makes `localStorage` throw
 * or forget. Every access is guarded, and the in-memory copy keeps the switch
 * working for the rest of the tab when a write does not stick.
 *
 * Read through `useSyncExternalStore` (see `useLichessIncludeMoves`) with a
 * server snapshot of `true`, so the server render and the first client
 * render agree and the stored choice is applied right after hydration.
 */

const STORAGE_KEY = 'blindfold-chess-lichess-include-moves';

/** The default: the game link opens at the same position, so it is the superset. */
export const DEFAULT_INCLUDE_MOVES = true;

const listeners = new Set<() => void>();

/**
 * The current value, read from storage once and then kept in memory, so the
 * `useSyncExternalStore` snapshot — read on every render of every control —
 * is a variable read rather than a storage access. A write updates it even
 * when storage refuses the write; another tab's write clears it so the next
 * read picks the stored value up.
 */
let cached: boolean | null = null;

export function readIncludeMoves(): boolean {
  if (cached === null) {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      cached = stored === null ? DEFAULT_INCLUDE_MOVES : stored === '1';
    } catch {
      cached = DEFAULT_INCLUDE_MOVES;
    }
  }
  return cached;
}

export function writeIncludeMoves(value: boolean): void {
  cached = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    // Storage unavailable: the cached value still holds the choice for this tab.
  }
  listeners.forEach((listener) => listener());
}

/** Another tab changed the stored value: drop the cached copy and re-read. */
function handleStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  cached = null;
  listeners.forEach((listener) => listener());
}

export function subscribeIncludeMoves(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener('storage', handleStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', handleStorage);
  };
}

/** Test-only: forget the cached value between cases. */
export function resetIncludeMovesForTests(): void {
  cached = null;
}
