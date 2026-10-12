/**
 * Hand-off point between the score summary's "Incorrect" count and the
 * result screen's problem list, so the count can open the missed problems.
 *
 * The summary lives in the shared `PracticeComplete`, while each module
 * renders its own problem list as `PracticeComplete` children — neither
 * owns the other. The list registers how to open its missed rows here, and
 * the count calls it.
 *
 * When nothing is registered (a module with no problem list, or a run with
 * nothing missed) the count stays plain text (`hasMistakeReveal`), so the
 * page never shows a link that does nothing when pressed.
 *
 * A result screen has at most one problem list, so this holds one handler.
 */

type Listener = () => void;

let reveal: (() => void) | undefined;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Registers how to open the missed problems. Returns the unregister. */
export function registerMistakeReveal(handler: () => void): () => void {
  reveal = handler;
  notify();
  return () => {
    if (reveal !== handler) return;
    reveal = undefined;
    notify();
  };
}

/** Called whenever a handler is registered or removed (`useSyncExternalStore`). */
export function subscribeMistakeReveal(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function hasMistakeReveal(): boolean {
  return reveal !== undefined;
}

/** Opens the missed problems; a no-op when nothing is registered. */
export function revealMistakes(): void {
  reveal?.();
}
