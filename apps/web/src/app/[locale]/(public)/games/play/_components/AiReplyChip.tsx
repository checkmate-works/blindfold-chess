'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { useAiReplyChip } from '@blindfold-chess/features/game-play/client';
import { FaRobot, FaSpinner } from 'react-icons/fa';

import { STATUS_PILL_CLASSES } from '../_lib';

// The visibility state machine is shared with the mobile app; it is
// re-exported here because this file is where the web's callers import it from.
export { useAiReplyChip };

type Props = {
  /** Whether the chip is currently shown (from {@link useAiReplyChip}). */
  active: boolean;
  /** AI is computing its reply — show the thinking spinner instead of a move. */
  thinking: boolean;
  /** Notation of the last AI move, e.g. "1… e5"; null if none. Wrapped here in
   *  localized "AI played …" copy with the notation bolded. */
  aiMoveNotation: string | null;
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
export function AiReplyChip({ active, thinking, aiMoveNotation }: Props) {
  const t = useTranslations('play');

  return (
    <div
      // Translation can replace the rich-text node beside <strong>. Switching
      // back to thinking then tries to remove that detached node (Sentry 6Z).
      translate="no"
      aria-live="polite"
      className={`${STATUS_PILL_CLASSES} max-w-full truncate border border-border bg-background/90 text-foreground shadow-md backdrop-blur-sm transition-opacity duration-300 ${
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
          <span className="truncate">
            {aiMoveNotation &&
              t.rich('aiPlayed', {
                move: aiMoveNotation,
                b: (chunks) => <strong className="text-lg font-bold">{chunks}</strong>,
              })}
          </span>
        </>
      )}
    </div>
  );
}
