/**
 * A one-line notice handed from the screen that just went away (or the row
 * that just acted) to the screen the player is looking at, which shows it as
 * a snackbar (`ScreenNoticeSnackbar`).
 *
 * @description
 * Several actions end by leaving: quitting a timed session or ending a
 * training run closes the session modal, deleting a saved game from its page
 * goes back to the list, and closing an unfinished AI game pops the session.
 * Without a word on the way out the player is left to guess what happened —
 * was the run thrown away, was the game kept? The leaving side posts a
 * notice here, and whichever screen is underneath shows it, the way a mail
 * app says "Draft saved" when its compose screen is closed.
 *
 * The two sides never meet (one is a modal popped off the root stack, the
 * other may be a tab, a setup screen or the history), so the notice goes
 * through this module-level store rather than through route params. An
 * action that stays on its screen (deleting a game from a list row) posts
 * here too, so every notice is drawn by the same snackbar.
 *
 * A notice is taken by the first focused screen that shows it, so two
 * screens mounted under one another never both show it. One that nobody
 * takes within {@link NOTICE_CLAIM_WINDOW_MS} is stale: the player landed
 * somewhere with no snackbar (the home tab after the onboarding's first
 * session, where the account offer opens instead) and a message turning up
 * later, on another screen, would describe nothing they just did.
 */

export type ScreenNoticeKind =
  /** An unfinished AI game was closed and its last write succeeded. */
  | { readonly kind: "gameSaved"; readonly gameId: string }
  /** An unfinished AI game was closed but its last write failed. */
  | { readonly kind: "gameSaveFailed" }
  | { readonly kind: "gameDeleted" }
  | { readonly kind: "gameDeleteFailed" }
  /** A session that asks before leaving (a timed run) was quit. */
  | { readonly kind: "sessionQuit" }
  /** A training run was ended with its End button. */
  | { readonly kind: "trainingEnded" };

export type ScreenNotice = ScreenNoticeKind & {
  /** When it was posted (`Date.now()`). */
  readonly postedAt: number;
};

/**
 * How long a posted notice waits for a screen to take it. Long enough to
 * outlast the modal's dismissal, short enough that it never surfaces after
 * the player has moved on.
 */
export const NOTICE_CLAIM_WINDOW_MS = 3000;

let current: ScreenNotice | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Posts `notice`, replacing any notice not yet taken. */
export function postScreenNotice(
  notice: ScreenNoticeKind,
  now = Date.now(),
): void {
  current = { ...notice, postedAt: now };
  emit();
}

/** The notice waiting to be taken, if any. */
export function getScreenNotice(): ScreenNotice | null {
  return current;
}

/**
 * Takes the waiting notice off the store and returns it if it is still
 * fresh, or drops it and returns null if it is stale.
 */
export function takeScreenNotice(now = Date.now()): ScreenNotice | null {
  const notice = current;
  if (!notice) return null;
  current = null;
  emit();
  return now - notice.postedAt <= NOTICE_CLAIM_WINDOW_MS ? notice : null;
}

/** For `useSyncExternalStore`. */
export function subscribeScreenNotice(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
