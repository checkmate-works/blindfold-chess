'use client';

import { useEffect, useRef } from 'react';

import type { NotationChar } from '@blindfold-chess/features/ai-game/notation-input';

import { shouldIgnoreKeyEvent } from '@/lib/keyboard-guards';

/**
 * Physical-keyboard input for the play screen's notation keypad
 * (`ButtonInput`), mirroring `useAlgebraicKeyboardInput` on the practice
 * screens: keyboard and mouse are two dispatchers into the same input state
 * machine, and the click UI is left untouched.
 *
 * Accepted keys are exactly the {@link NotationChar} set — uppercase piece
 * letters (`K`/`Q`/`R`/`B`/`N`), lowercase files (`a`-`h`), ranks (`1`-`8`),
 * and the symbols `x` `+` `=` `#` — plus `Backspace` and `Enter` (submit).
 * Everything else falls through untouched so browser shortcuts, Tab, arrow
 * keys, etc. keep working. Following SAN, case disambiguates the `b`
 * collision: `Shift+b` is the bishop, plain `b` the file — which is why this
 * hook allows Shift through the shared guard (uppercase letters and `+`/`#`
 * are shifted keystrokes; matching on `event.key`, the produced character,
 * keeps the filtering strict). Castling has no single-character key and
 * remains click-only.
 *
 * `Enter` is special-cased beyond the shared guards: a window-level Enter
 * handler must not steal activation from a tab-focused link or button
 * elsewhere on the page (resign, navigation, …). Enter is therefore only
 * consumed when nothing is focused (`event.target` is `<body>`) or focus sits
 * inside `containerRef` — where `preventDefault()` also suppresses the native
 * click of a focused keypad button, so submit fires exactly once. Character
 * keys need no such scoping (they trigger no native activation on buttons).
 *
 * The listener is detached entirely when `enabled` is false; pass the same
 * flag that disables the on-screen buttons. Mounting is already scoped to the
 * button input mode because `MoveInputPanel` renders input modes exclusively.
 */
type UseNotationKeyboardInputOptions = {
  /** Called with the typed character when it is a valid {@link NotationChar}. */
  onChar: (char: NotationChar) => void;
  /** Called on `Backspace`. */
  onBackspace: () => void;
  /** Called on `Enter` (subject to the focus scoping above). The caller
   * decides submittability — this fires whether or not a move is complete. */
  onSubmit: () => void;
  /** The keypad card element; bounds Enter handling when focus is inside it. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** When false, the listener is not attached at all. */
  enabled: boolean;
};

const NOTATION_KEYS: ReadonlySet<string> = new Set<NotationChar>([
  'K',
  'Q',
  'R',
  'B',
  'N',
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  'x',
  '+',
  '=',
  '#',
]);

export function useNotationKeyboardInput({
  onChar,
  onBackspace,
  onSubmit,
  containerRef,
  enabled,
}: UseNotationKeyboardInputOptions) {
  // Keep callbacks in a ref so the effect only re-runs when `enabled` toggles.
  // This avoids churning the window listener on every render of the caller.
  const callbacksRef = useRef({ onChar, onBackspace, onSubmit });
  callbacksRef.current = { onChar, onBackspace, onSubmit };

  useEffect(() => {
    if (!enabled) return;

    const handler = (event: KeyboardEvent) => {
      if (shouldIgnoreKeyEvent(event, { allowShift: true })) return;

      const { key } = event;
      if (NOTATION_KEYS.has(key)) {
        event.preventDefault();
        callbacksRef.current.onChar(key as NotationChar);
        return;
      }
      if (key === 'Backspace') {
        event.preventDefault();
        callbacksRef.current.onBackspace();
        return;
      }
      if (key === 'Enter') {
        const target = event.target;
        const insideKeypad =
          target instanceof Node && (containerRef.current?.contains(target) ?? false);
        if (target !== document.body && !insideKeypad) return;
        event.preventDefault();
        callbacksRef.current.onSubmit();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
    // containerRef is a stable ref object; reading .current inside the
    // handler always sees the latest element.
  }, [enabled, containerRef]);
}
