'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaUserFriends } from 'react-icons/fa';

import { STATUS_PILL_CLASSES } from '@/app/[locale]/(public)/games/play/_lib';

type Props = {
  /** Whether the chip is currently shown (from {@link useAiReplyChip}). */
  active: boolean;
  /** Notation of the last auto-filled opponent move, e.g. "1… e5"; null if none. */
  moveNotation: string | null;
};

/**
 * Floating status chip centered over the board, shown when "Auto-fill
 * opponent's moves" plays a move for the opponent while the board is masked.
 * Mirrors games/play's `AiReplyChip` (same visibility state machine via
 * `useAiReplyChip`, same board-center slot) but with recall-appropriate
 * copy — the opponent here is whoever played the other side in the original
 * game, not necessarily an engine.
 */
export function RecallOpponentMoveChip({ active, moveNotation }: Props) {
  const t = useTranslations('recall');

  return (
    <div
      aria-live="polite"
      className={`${STATUS_PILL_CLASSES} max-w-full truncate border border-border bg-background/90 text-foreground shadow-md backdrop-blur-sm transition-opacity duration-300 ${
        active ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <FaUserFriends className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">
        {moveNotation &&
          t.rich('opponentPlayed', {
            move: moveNotation,
            b: (chunks) => <strong className="text-lg font-bold">{chunks}</strong>,
          })}
      </span>
    </div>
  );
}
