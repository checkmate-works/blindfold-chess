'use client';

import { useEffect } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ChessPiece } from './ChessPiece';

/** Promotion piece types in display order — queen first, then descending importance. */
const PROMOTION_TYPES = ['q', 'r', 'b', 'n'] as const;
type PromotionType = (typeof PROMOTION_TYPES)[number];

type Props = {
  /** File of the destination square (0=a, 7=h, in absolute board coords). */
  fileIndex: number;
  /** Rank of the destination square (0=rank 8, 7=rank 1, in absolute board coords). */
  rankIndex: number;
  /** Whether the board is rendered flipped (black at bottom). */
  flipped: boolean;
  /** The color that is doing the promoting — drives the piece icons. */
  promotingColor: 'w' | 'b';
  /** Fires with the chosen promotion type. The parent commits the move. */
  onSelect: (type: PromotionType) => void;
  /** Fires when the user dismisses the picker (backdrop click, Esc, etc.). */
  onCancel: () => void;
};

/**
 * Inline picker for choosing the piece a pawn promotes into. Renders as a
 * vertical stack of four buttons (Q / R / B / N in that order) positioned
 * over the destination square. The stack extends downward when the
 * destination is in the top half of the rendered board and upward when it
 * is in the bottom half, so the picker stays on the board edges.
 *
 * Always shows normal piece icons regardless of the player's obfuscation
 * settings (showOwnPieces / pieceShapeMode / pieceColors): the picker is a
 * deliberate UI moment for a piece-type choice, and circles or hidden pieces
 * would defeat the purpose of letting the player see what they're choosing.
 *
 * Cancellation: a transparent full-board backdrop captures clicks outside
 * the picker, and an Esc keydown listener handles keyboard dismiss.
 */
export function PromotionPicker({
  fileIndex,
  rankIndex,
  flipped,
  promotingColor,
  onSelect,
  onCancel,
}: Props) {
  const t = useTranslations('play');

  // Esc dismisses the picker. Listener is window-scoped so it works without
  // requiring focus on a specific element.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  // Map (fileIndex, rankIndex) → visual (column, row) accounting for board flip.
  const visualCol = flipped ? 7 - fileIndex : fileIndex;
  const visualRow = flipped ? 7 - rankIndex : rankIndex;

  // Stack downward when destination is in the top half (visualRow < 4),
  // upward otherwise. Each option is one square tall (12.5% of board height).
  const stackDown = visualRow < 4;
  const leftPct = visualCol * 12.5;
  const topPct = stackDown ? visualRow * 12.5 : (visualRow - 3) * 12.5;
  const orderedTypes: PromotionType[] = stackDown
    ? [...PROMOTION_TYPES]
    : [...PROMOTION_TYPES].reverse();

  const labelKey: Record<PromotionType, string> = {
    q: 'promotionPicker.promoteTo.queen',
    r: 'promotionPicker.promoteTo.rook',
    b: 'promotionPicker.promoteTo.bishop',
    n: 'promotionPicker.promoteTo.knight',
  };

  return (
    <>
      {/* Backdrop — fills the board container so any click outside the
          picker buttons cancels. z-index keeps it below the picker but
          above the squares so it intercepts before square clicks. */}
      <button
        type="button"
        aria-label={t('promotionPicker.cancel')}
        onClick={onCancel}
        className="absolute inset-0 z-10 cursor-default bg-foreground/20"
      />

      {/* Picker stack */}
      <div
        className="absolute z-20 flex flex-col rounded-md overflow-hidden shadow-lg ring-1 ring-border"
        style={{
          left: `${leftPct}%`,
          top: `${topPct}%`,
          width: '12.5%',
        }}
      >
        {orderedTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
            aria-label={t(labelKey[type])}
            className="aspect-square w-full flex items-center justify-center bg-card hover:bg-muted transition-colors"
          >
            <ChessPiece type={type} color={promotingColor} size={45} />
          </button>
        ))}
      </div>
    </>
  );
}
