'use client';

import { useCallback, useEffect, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaRobot, FaSpinner } from 'react-icons/fa';

/** Default window the AI-move chip stays before fading out, when the user has
 *  not configured one. Mirrors DEFAULT_AI_REPLY_DURATION in ai-reply-duration.ts. */
const MOVE_VISIBLE_MS = 4000;

/**
 * Visibility state machine for the on-board AI-reply chip, lifted out of the
 * presentational component so the board can coordinate with it (it hides the
 * blindfold mask's center label while the chip is `active`, then restores it).
 *
 * - `thinking`: the AI is computing — a persistent spinner chip.
 * - `active`: the chip occupies the board center (thinking, or within the
 *   transient window after a move). `aiMoveSignal` bumps once per AI move;
 *   the move stays for `durationMs`, then `active` clears and the chip fades
 *   out. A `durationMs` of `0` keeps the move visible indefinitely (until the
 *   next reply), restoring the historical "stays until the player responds"
 *   behavior.
 * - `dismiss`: clears the move announcement on demand. Called when the player
 *   reveals the board (peek): once the position is visible the "AI played …"
 *   label is redundant, and with `durationMs === 0` it would otherwise linger
 *   over the open board forever.
 */
export function useAiReplyChip({
  isAiThinking,
  aiMoveSignal,
  durationMs = MOVE_VISIBLE_MS,
}: {
  isAiThinking: boolean;
  aiMoveSignal: number;
  /** Auto-dismiss window in ms; `0` (or negative) means never auto-dismiss. */
  durationMs?: number;
}): { active: boolean; thinking: boolean; dismiss: () => void } {
  const [moveVisible, setMoveVisible] = useState(false);

  useEffect(() => {
    if (!aiMoveSignal) return;
    setMoveVisible(true);
    // durationMs <= 0 → keep the move visible until the next reply re-triggers
    // this effect; skip the auto-dismiss timer entirely.
    if (durationMs <= 0) return;
    const id = setTimeout(() => setMoveVisible(false), durationMs);
    return () => clearTimeout(id);
  }, [aiMoveSignal, durationMs]);

  const dismiss = useCallback(() => setMoveVisible(false), []);

  return { active: isAiThinking || moveVisible, thinking: isAiThinking, dismiss };
}

type Props = {
  /** Whether the chip is currently shown (from {@link useAiReplyChip}). */
  active: boolean;
  /** AI is computing its reply — show the thinking spinner instead of a move. */
  thinking: boolean;
  /** Localized label for the last AI move, e.g. "AI played 1… e5"; null if none. */
  aiMoveDisplay: string | null;
};

/**
 * Floating status chip centered over the board (always-present-board model), so
 * the AI's reply is visible without scrolling up to the page title. While
 * `active` it sits in the board center (the mask's own label steps aside — see
 * `InlineBoardView`'s `badgeActive`); when it clears it fades out and the mask
 * label returns.
 *
 * Purely informational — the wrapping slot is `pointer-events-none`, so taps
 * pass through to the board / blindfold mask below.
 */
export function AiReplyChip({ active, thinking, aiMoveDisplay }: Props) {
  const t = useTranslations('play');

  return (
    <div
      aria-live="polite"
      className={`inline-flex max-w-full items-center gap-2 truncate rounded-full border border-border bg-background/90 px-4 py-2 text-sm font-medium text-foreground shadow-md backdrop-blur-sm transition-opacity duration-300 ${
        active ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {thinking ? (
        <>
          <FaSpinner className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          <span className="truncate">{t('aiThinking')}</span>
        </>
      ) : (
        <>
          <FaRobot className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{aiMoveDisplay}</span>
        </>
      )}
    </div>
  );
}
