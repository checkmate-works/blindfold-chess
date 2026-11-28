/**
 * The "game saved" notice handed from a closed AI game to the screen the
 * player lands on.
 *
 * @description
 * Leaving an unfinished game loses nothing (it is saved after every move),
 * but nothing on the way out said so. The session posts a notice here as it
 * goes away, and whichever screen is underneath shows it as a snackbar with a
 * button back into the game — the shape of the "Draft saved" snackbar a
 * mail app shows when its compose screen is closed.
 *
 * The session and the screen below it never meet (one is a modal popped off
 * the root stack, the other may be a tab, a setup screen or the history),
 * so the notice goes through this module-level store rather than through
 * route params.
 *
 * A notice is taken by the first screen that shows it, so two screens
 * mounted under one another never both show it. One that nobody takes
 * within {@link NOTICE_CLAIM_WINDOW_MS} is stale: the player landed
 * somewhere with no snackbar (the home tab after the onboarding's first
 * game, where the account offer opens instead) and a "saved" message
 * turning up later, on another screen, would describe nothing they just did.
 */

export type SavedGameNotice = {
  /** The saved game's id, to resume it from the snackbar. */
  readonly gameId: string;
  /** When the session posted it (`Date.now()`). */
  readonly postedAt: number;
};

/**
 * How long a posted notice waits for a screen to take it. Long enough to
 * outlast the modal's dismissal, short enough that it never surfaces after
 * the player has moved on.
 */
export const NOTICE_CLAIM_WINDOW_MS = 3000;

let current: SavedGameNotice | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Posts the notice for `gameId`, replacing any notice not yet taken. */
export function postSavedGameNotice(gameId: string, now = Date.now()): void {
  current = { gameId, postedAt: now };
  emit();
}

/** The notice waiting to be taken, if any. */
export function getSavedGameNotice(): SavedGameNotice | null {
  return current;
}

/**
 * Takes the waiting notice off the store and returns it if it is still
 * fresh, or drops it and returns null if it is stale.
 */
export function takeSavedGameNotice(now = Date.now()): SavedGameNotice | null {
  const notice = current;
  if (!notice) return null;
  current = null;
  emit();
  return now - notice.postedAt <= NOTICE_CLAIM_WINDOW_MS ? notice : null;
}

/** For `useSyncExternalStore`. */
export function subscribeSavedGameNotice(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
