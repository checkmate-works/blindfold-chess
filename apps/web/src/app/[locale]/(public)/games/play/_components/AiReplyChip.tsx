'use client';

import { useEffect, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaRobot, FaSpinner } from 'react-icons/fa';

type Props = {
  /** AI is computing its reply (`!isPlayerTurn && isLoading`). */
  isAiThinking: boolean;
  /** Localized label for the last AI move, e.g. "AI played 1… e5"; null if none. */
  aiMoveDisplay: string | null;
  /** Bumps once per AI move — triggers the transient "just played" surface. */
  aiMoveSignal: number;
};

/** How long the AI-move chip stays before fading out. */
const MOVE_VISIBLE_MS = 4000;

/**
 * Floating status chip shown over the board (always-present-board model), so
 * the AI's reply is visible without scrolling up to the page title.
 *
 * - While the AI is thinking: a persistent "AI is thinking…" spinner chip.
 * - When the AI plays: the move label appears, then fades out after a few
 *   seconds (`aiMoveSignal` bumps once per move; `aiMoveDisplay` is the
 *   persistent last-move label this transiently surfaces).
 *
 * Purely informational — the wrapping slot is `pointer-events-none`, so taps
 * pass through to the board / blindfold mask below.
 */
export function AiReplyChip({ isAiThinking, aiMoveDisplay, aiMoveSignal }: Props) {
  const t = useTranslations('play');
  const [moveVisible, setMoveVisible] = useState(false);

  useEffect(() => {
    if (!aiMoveSignal) return;
    setMoveVisible(true);
    const id = setTimeout(() => setMoveVisible(false), MOVE_VISIBLE_MS);
    return () => clearTimeout(id);
  }, [aiMoveSignal]);

  const showThinking = isAiThinking;
  const showMove = !isAiThinking && moveVisible && !!aiMoveDisplay;
  const visible = showThinking || showMove;

  return (
    <div
      aria-live="polite"
      className={`inline-flex max-w-full items-center gap-2 truncate rounded-full border border-border bg-background/90 px-3 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {showThinking ? (
        <>
          <FaSpinner className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
          <span className="truncate">{t('aiThinking')}</span>
        </>
      ) : (
        <>
          <FaRobot className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{aiMoveDisplay}</span>
        </>
      )}
    </div>
  );
}
