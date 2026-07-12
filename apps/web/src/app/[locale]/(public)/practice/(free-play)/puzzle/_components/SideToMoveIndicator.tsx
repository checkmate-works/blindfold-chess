'use client';

import { useTranslations } from 'next-intl';

import type { SideToMove } from '../../_lib/board-editor-constants';

/**
 * The "⚪ White to move" / "⚫ Black to move" line shown above the board on
 * both authoring steps (position: the edited position's turn; solution: the
 * side to play at the current point of the entered line).
 */
export function SideToMoveIndicator({ turn }: { turn: SideToMove }) {
  const t = useTranslations('practice.puzzle.create');

  return (
    <>
      <span aria-hidden className="mr-1">
        {turn === 'w' ? '⚪' : '⚫'}
      </span>
      {turn === 'w' ? t('whiteToMove') : t('blackToMove')}
    </>
  );
}
