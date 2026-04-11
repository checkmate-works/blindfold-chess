'use client';

import type { ArrowKey, ArrowKeyBinding } from './ArrowKeyAnswer';

const ARROW_GLYPH: Record<ArrowKey, string> = {
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
};

type Props = {
  bindings: Array<[ArrowKey, ArrowKeyBinding]>;
  disabled?: boolean;
};

/**
 * Desktop-only ("pointer: fine") hint strip rendered automatically by
 * `ArrowKeyAnswer`. Items are derived from the same bindings array used by
 * the keydown handler, so the hint cannot drift from the actual handlers.
 */
export function KeyboardHint({ bindings, disabled = false }: Props) {
  if (bindings.length === 0) return null;

  return (
    <div
      className={`mt-4 hidden [@media(pointer:fine)]:flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground transition-opacity ${
        disabled ? 'opacity-40' : 'opacity-100'
      }`}
      aria-hidden="true"
      data-testid="keyboard-hint"
    >
      {bindings.map(([key, binding]) => (
        <span key={key} className="inline-flex items-center gap-1">
          <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1 rounded border border-border bg-muted font-mono text-[0.7rem] text-foreground">
            {ARROW_GLYPH[key]}
          </kbd>
          <span>{binding.label}</span>
        </span>
      ))}
    </div>
  );
}

type TextProps = {
  /** Hint sentence to display. */
  text: string;
  /** When true, the hint is dimmed to match the inactive state of its target UI. */
  disabled?: boolean;
};

/**
 * Plain-text variant of the desktop keyboard hint. Use this when the key set
 * is too wide to render individual `<kbd>` glyphs (e.g. typing any file
 * `a`-`h` followed by any rank `1`-`8`). Same desktop-only visibility and
 * muted styling as {@link KeyboardHint}.
 */
export function KeyboardHintText({ text, disabled = false }: TextProps) {
  if (!text) return null;

  return (
    <div
      className={`mt-4 hidden [@media(pointer:fine)]:flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground transition-opacity ${
        disabled ? 'opacity-40' : 'opacity-100'
      }`}
      aria-hidden="true"
      data-testid="keyboard-hint-text"
    >
      <span>{text}</span>
    </div>
  );
}
