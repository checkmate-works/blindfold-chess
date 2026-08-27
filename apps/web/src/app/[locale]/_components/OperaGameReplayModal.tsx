'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { MiniBoard } from '@/lib/positions/ui/MiniBoard';

import { HorizontalMoveList } from '@/app/[locale]/(public)/games/play/_components/HorizontalMoveList';
import { MoveNavigationRow } from '@/app/[locale]/(public)/games/play/_components/MoveNavigationRow';
import { useBoardDisplay } from '@/app/[locale]/_hooks/use-board-display';
import { usePgnReplay } from '@/app/[locale]/_hooks/use-pgn-replay';

import { BoardModal } from './BoardModal';
import { OPERA_GAME_FINAL_FEN, OPERA_GAME_MOVES } from './opera-game-moves';

type Props = {
  /**
   * Cursor to open at, in `usePgnReplay` index space: the ply index of the
   * tapped move, or -1 for the starting position.
   */
  initialIndex: number;
  onClose: () => void;
};

/**
 * The board half of `OperaGameDemo`: `usePgnReplay` over the shared Opera
 * Game constant, stepped through the same modal stack as every other board
 * (`BoardModal` chrome, `HorizontalMoveList` strip, `MoveNavigationRow`
 * controls). Mounted only while open, and reached only through
 * `OperaGameDemo`'s `next/dynamic({ ssr: false })` boundary — this file is
 * where chess.js enters the graph, and that boundary keeps it out of every
 * markdown route's initial bundle.
 *
 * @design Why not `BoardReviewModal`
 *
 * topics' `BoardReviewModal` is this exact composition, but it reads its
 * flip label from the `attachment` namespace. This demo renders through the
 * markdown pipeline, which is mounted on almost every route subtree — learn,
 * dojo, and the unscoped articles/announcements/manual pages — and the
 * scoped i18n dictionaries (see `i18n-scopes.ts`) would each have to start
 * shipping `attachment` sitewide to serve that one label. Composing the
 * same shared parts directly keeps the whole stack inside `Common`, which
 * every dictionary already carries.
 */
export function OperaGameReplayModal({ initialIndex, onClose }: Props) {
  const t = useTranslations('Common');
  const [flipped, setFlipped] = useState(false);
  const replay = usePgnReplay({
    moves: OPERA_GAME_MOVES,
    finalFen: OPERA_GAME_FINAL_FEN,
    initialIndex,
  });
  const display = useBoardDisplay(replay.lastMove);

  return (
    <BoardModal title={t('operaGame.title')} onClose={onClose} maxWidth="max-w-md">
      <>
        <HorizontalMoveList
          className="border-b border-border"
          formattedPgn={replay.formattedPgn}
          currentPosition={replay.index}
          onNavigateToPosition={replay.toIndex}
        />

        <MiniBoard
          fen={replay.fen}
          flipped={flipped}
          responsive
          lastMove={display.lastMove}
          showCoordinates={display.showCoordinates}
        />

        <MoveNavigationRow
          className="border-t border-border"
          onNavigateToStart={replay.toStart}
          onNavigatePrevious={replay.previous}
          onNavigateNext={replay.next}
          onNavigateToEnd={replay.toEnd}
          isPreviousDisabled={replay.isAtStart}
          isNextDisabled={replay.isAtEnd}
          flip={{ onClick: () => setFlipped((f) => !f), label: t('flipBoard') }}
        />
      </>
    </BoardModal>
  );
}
