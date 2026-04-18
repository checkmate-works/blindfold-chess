'use client';

import { useEffect, useRef } from 'react';

import { shouldIgnoreKeyEvent } from '@/app/[locale]/(public)/practice/_lib/keyboard-guards';

/**
 * Hook that binds keyboard input to a coordinate-entry practice feature using
 * standard chess algebraic notation.
 *
 * It listens on the window for lowercase file letters (`a`-`h`), rank digits
 * (`1`-`8`), and `Backspace`, and forwards them to the provided callbacks.
 * Uppercase letters are intentionally ignored (the caller decides the exact
 * character stream it accepts), and other keys are left alone so browser
 * shortcuts, Tab, Arrow keys, etc. continue to work normally.
 *
 * Use this when a practice screen already has click-driven coordinate entry
 * (e.g. the diagonal-quiz keypad) and you want keyboard input to drive the
 * exact same handlers in lockstep with the buttons. The click UI should be
 * left untouched — this hook is purely additive.
 *
 * The listener is detached entirely when `enabled` is false, so callers can
 * pass the same `isDisabled` flag used by the on-screen buttons.
 *
 * Bypass cases (listener is attached but no callback fires):
 *   - Ctrl / Meta / Alt / Shift modifier is held.
 *   - `event.repeat === true` (auto-repeat from held key).
 *   - Focus is inside an `<input>`, `<textarea>`, `<select>`, or a
 *     contenteditable element.
 *   - Any app-owned modal (`[data-app-modal="true"]`) is in the DOM (so modal
 *     Escape, form typing, etc. take precedence). The selector intentionally
 *     ignores third-party `aria-modal` elements (e.g. CookieYes) — see
 *     `keyboard-guards.ts` → `isModalOpen()` for the rationale.
 */
type UseAlgebraicKeyboardInputOptions = {
  /** Called with the pressed letter when the user types `a`..`h` (lowercase only). */
  onFile: (file: string) => void;
  /** Called with the pressed digit when the user types `1`..`8`. */
  onRank: (rank: string) => void;
  /** Called when the user presses `Backspace`. */
  onBackspace: () => void;
  /**
   * When false, the listener is not attached at all. Toggle this with the
   * same flag that disables the click UI (countdowns, result overlays, etc).
   */
  enabled: boolean;
};

const FILE_KEYS = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
const RANK_KEYS = new Set(['1', '2', '3', '4', '5', '6', '7', '8']);

export function useAlgebraicKeyboardInput({
  onFile,
  onRank,
  onBackspace,
  enabled,
}: UseAlgebraicKeyboardInputOptions) {
  // Keep callbacks in a ref so the effect only re-runs when `enabled` toggles.
  // This avoids churning the window listener on every render of the caller.
  const callbacksRef = useRef({ onFile, onRank, onBackspace });
  callbacksRef.current = { onFile, onRank, onBackspace };

  useEffect(() => {
    if (!enabled) return;

    const handler = (event: KeyboardEvent) => {
      if (shouldIgnoreKeyEvent(event)) return;

      const { key } = event;
      if (FILE_KEYS.has(key)) {
        event.preventDefault();
        callbacksRef.current.onFile(key);
        return;
      }
      if (RANK_KEYS.has(key)) {
        event.preventDefault();
        callbacksRef.current.onRank(key);
        return;
      }
      if (key === 'Backspace') {
        event.preventDefault();
        callbacksRef.current.onBackspace();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [enabled]);
}
