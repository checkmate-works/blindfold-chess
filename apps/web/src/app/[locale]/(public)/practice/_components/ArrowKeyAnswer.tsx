'use client';

import { type ReactNode, useEffect, useMemo } from 'react';

import { KeyboardHint } from './KeyboardHint';

/**
 * Declarative wrapper component that binds arrow keys to answer actions.
 *
 * Wrap an answer UI with this component and pass a `bindings` map. The
 * window keydown listener and the desktop-only `KeyboardHint` are derived
 * from the same map, so the help text can never drift from the actual
 * handlers.
 *
 * The wrapper is purely additive — existing click/tap handlers continue to
 * work. It bails out automatically when:
 *   - `disabled` is true
 *   - the user is typing in an input / textarea / contenteditable
 *   - any modal (`[aria-modal="true"]`) is open
 *   - a modifier key (Ctrl/Meta/Alt/Shift) is held, so browser shortcuts win
 *   - the keydown event has `repeat=true` (auto-repeat)
 */
export type ArrowKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

export type ArrowKeyBinding = {
  /** Short label shown in the keyboard hint (e.g. "Light", "Legal"). */
  label: string;
  /** Called when the user presses this key while the wrapper is enabled. */
  onTrigger: () => void;
};

/** Map of arrow key → binding. Only populated keys are listened for. */
export type ArrowKeyBindings = Partial<Record<ArrowKey, ArrowKeyBinding>>;

type Props = {
  bindings: ArrowKeyBindings;
  /**
   * When true, key handlers and the help text are inert. Use this for
   * countdowns, paused state, post-answer feedback windows, etc.
   */
  disabled?: boolean;
  /** Optional className applied to the outer wrapper. */
  className?: string;
  /** Hide the desktop keyboard hint. Defaults to false (hint is shown). */
  hideHint?: boolean;
  children: ReactNode;
};

const ARROW_KEYS: ReadonlySet<string> = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
]);

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

function isModalOpen(): boolean {
  if (typeof document === 'undefined') return false;
  // Intentionally broad: any element with aria-modal="true" (QuitConfirmModal, RankAchievementModal, future dialogs) should block arrow-key answers.
  return document.querySelector('[aria-modal="true"]') !== null;
}

/** Canonical hint render order: left → up → down → right. */
const HINT_ORDER: readonly ArrowKey[] = ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'];

export function ArrowKeyAnswer({
  bindings,
  disabled = false,
  className,
  hideHint = false,
  children,
}: Props) {
  const orderedBindings = useMemo<Array<[ArrowKey, ArrowKeyBinding]>>(() => {
    return HINT_ORDER.map((key) => [key, bindings[key]] as const).filter(
      (entry): entry is [ArrowKey, ArrowKeyBinding] => entry[1] !== undefined
    );
  }, [bindings]);

  useEffect(() => {
    if (disabled) return;
    if (orderedBindings.length === 0) return;

    const handler = (event: KeyboardEvent) => {
      if (!ARROW_KEYS.has(event.key)) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (event.repeat) return;
      if (isEditableElement(event.target)) return;
      if (isModalOpen()) return;

      const binding = bindings[event.key as ArrowKey];
      if (!binding) return;

      event.preventDefault();
      binding.onTrigger();
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [bindings, disabled, orderedBindings.length]);

  return (
    <div className={className}>
      {children}
      {!hideHint && orderedBindings.length > 0 && (
        <KeyboardHint bindings={orderedBindings} disabled={disabled} />
      )}
    </div>
  );
}
