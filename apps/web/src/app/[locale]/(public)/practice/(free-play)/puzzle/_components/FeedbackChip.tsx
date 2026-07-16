'use client';

import { FaCheck, FaTimes } from 'react-icons/fa';

import type { PuzzleFeedbackKind } from '../_hooks/use-puzzle-board-feedback';

/**
 * Transient submit-feedback chip. `incorrect` is a red chip with an × icon;
 * `correct` (an accepted non-final move) is a green chip with a ✓ icon;
 * `solved` is a green chip whose label already carries the celebratory 🎉 (so
 * no separate icon). The `board` variant is larger and solid-filled for
 * legibility centered over the board; the `input` variant is the compact chip
 * pinned to the input panel. Re-mount via a changing `key` at the call site is
 * what replays the one-shot `feedback-pop` animation.
 */
export function FeedbackChip({
  kind,
  variant,
  label,
}: {
  kind: PuzzleFeedbackKind;
  variant: 'board' | 'input';
  label: string;
}) {
  const positive = kind === 'correct' || kind === 'solved';
  const icon =
    kind === 'incorrect' ? (
      <FaTimes className={variant === 'board' ? 'h-4 w-4' : 'h-3 w-3'} />
    ) : kind === 'correct' ? (
      <FaCheck className={variant === 'board' ? 'h-4 w-4' : 'h-3 w-3'} />
    ) : null;
  const testId = `submit-feedback-${kind}${variant === 'board' ? '-board' : ''}`;

  if (variant === 'board') {
    return (
      <span
        data-testid={testId}
        className={`motion-safe:animate-feedback-pop inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold text-white shadow-md ${
          positive ? 'border-green-500/40 bg-green-600/90' : 'border-red-500/40 bg-red-500/90'
        }`}
      >
        {icon}
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span
      data-testid={testId}
      className={`motion-safe:animate-feedback-pop inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm ${
        positive
          ? 'border-green-500/30 bg-green-500/15 text-green-700 dark:text-green-300'
          : 'border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300'
      }`}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}
