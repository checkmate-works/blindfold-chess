'use client';

import { useEffect } from 'react';

import { useLatestRef } from '@blindfold-chess/features/common/client';
import { FILES, RANKS } from '@blindfold-chess/types';

import { shouldIgnoreKeyEvent } from '@/lib/keyboard-guards';

/**
 * Hook that binds keyboard input to a coordinate-entry practice feature using
 * standard chess algebraic notation.
 *
 * It listens on the window for lowercase file letters (`a`-`h`), rank digits
 * (`1`-`8`), `Backspace`, and — when `onEnter` is given — `Enter`, and
 * forwards them to the provided callbacks.
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
 *     ignores third-party `aria-modal` elements (e.g. the consent-management
 *     banner) — see `keyboard-guards.ts` → `isModalOpen()` for the rationale.
 *
 * `Enter` is opt-in and scoped further than the other keys. Screens whose
 * answer is complete as soon as the last character is typed (diagonal quiz,
 * board symmetry) have nothing to confirm, so they leave `onEnter` out and
 * Enter falls through untouched. A screen with a submit button passes
 * `onEnter` so a keyboard user does not have to reach for the mouse to
 * confirm. Even then, a window-level Enter handler must not steal activation
 * from a tab-focused link or button elsewhere on the page (skip, end
 * training, navigation): Enter is consumed only when nothing is focused
 * (`event.target` is `<body>`) or focus sits inside `containerRef`. Inside the
 * container `preventDefault()` also suppresses the native click of a focused
 * on-screen button — after a mouse click on the `c` key, Enter submits
 * instead of toggling `c` off again — so the action fires exactly once. The
 * play screen's `useNotationKeyboardInput` scopes Enter the same way.
 */
type UseAlgebraicKeyboardInputOptions = {
  /** Called with the pressed letter when the user types `a`..`h` (lowercase only). */
  onFile: (file: string) => void;
  /** Called with the pressed digit when the user types `1`..`8`. */
  onRank: (rank: string) => void;
  /** Called when the user presses `Backspace`. */
  onBackspace: () => void;
  /**
   * Called on `Enter`, subject to the focus scoping described above. Omit it
   * and Enter is not handled at all. The caller decides whether the answer
   * is submittable — this fires whether or not anything has been typed.
   */
  onEnter?: () => void;
  /**
   * The element holding the on-screen input and its submit button; bounds
   * Enter handling when focus is inside it. Without it, Enter is handled
   * only while nothing is focused.
   */
  containerRef?: React.RefObject<HTMLElement | null>;
  /**
   * When false, the listener is not attached at all. Toggle this with the
   * same flag that disables the click UI (countdowns, result overlays, etc).
   */
  enabled: boolean;
};

const FILE_KEYS = new Set<string>(FILES);
const RANK_KEYS = new Set<string>(RANKS);

export function useAlgebraicKeyboardInput({
  onFile,
  onRank,
  onBackspace,
  onEnter,
  containerRef,
  enabled,
}: UseAlgebraicKeyboardInputOptions) {
  // Keep callbacks in a ref so the effect only re-runs when `enabled` toggles.
  // This avoids churning the window listener on every render of the caller.
  const callbacksRef = useLatestRef({ onFile, onRank, onBackspace, onEnter });

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
      if (key === 'Enter') {
        const submit = callbacksRef.current.onEnter;
        if (!submit) return;
        const target = event.target;
        const insideContainer =
          target instanceof Node && (containerRef?.current?.contains(target) ?? false);
        if (target !== document.body && !insideContainer) return;
        event.preventDefault();
        submit();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
    // containerRef is a stable ref object; reading .current inside the
    // handler always sees the latest element.
  }, [enabled, callbacksRef, containerRef]);
}
