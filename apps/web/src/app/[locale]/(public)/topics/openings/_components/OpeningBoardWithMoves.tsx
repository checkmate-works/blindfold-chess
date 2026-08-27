'use client';

import { useCallback, useMemo } from 'react';

import { useRouter } from 'next/navigation';

import { BoardFrame, Button } from '@/app/_components';
import { BOARD_RADIUS_EXPAND_ON_MOBILE } from '@/app/_components/chess/BoardFrame';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { parsePgn } from '@blindfold-chess/features/chess-core';
import { FaPlusCircle } from 'react-icons/fa';

import { MiniBoard } from '@/lib/positions/ui/MiniBoard';

import { HorizontalMoveList } from '@/app/[locale]/(public)/games/play/_components/HorizontalMoveList';
import { MoveNavigationRow } from '@/app/[locale]/(public)/games/play/_components/MoveNavigationRow';
import { useBoardFlip } from '@/app/[locale]/(public)/games/play/_hooks/use-board-flip';
import { useBoardDisplay } from '@/app/[locale]/_hooks/use-board-display';
import { usePgnReplay } from '@/app/[locale]/_hooks/use-pgn-replay';

import { isBlackOpening } from '../_lib/openings';

type Props = {
  fen: string;
  pgn: string;
};

/**
 * The opening's main line, played out on a board: the move strip, the board,
 * the stepper, and a CTA that starts a game from the position in view.
 *
 * Structurally this is the same stack every other board+moves surface uses
 * (`HorizontalMoveList` above, `MoveNavigationRow` below), which it did not
 * used to be — it carried its own copies of both, so it missed the mobile
 * touch-target sizing, the scroll-into-view move strip, the last-move ring,
 * the coordinates preference, and translated button labels (its `aria-label`s
 * were hardcoded English). Only the CTA below the board is specific to
 * openings.
 */
export function OpeningBoardWithMoves({ fen, pgn }: Props) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('topics.openings');
  const tCommon = useTranslations('Common');
  // A seeded opening's PGN that no longer parses degrades to an empty
  // replay; this used to be an unguarded call inside the memo, so one bad
  // row took the whole page to its error boundary.
  const moves = useMemo(() => {
    const parsed = parsePgn(pgn);
    return parsed.ok ? parsed.value : [];
  }, [pgn]);

  // The side the opening is played from — which is also the side the board
  // faces by default, and the colour a game started from here is played as.
  const side = isBlackOpening(fen) ? 'black' : 'white';

  const replay = usePgnReplay({ moves, finalFen: fen });
  const display = useBoardDisplay(replay.lastMove);
  const { effectiveFlipped, toggleFlip } = useBoardFlip({ playerSide: side });

  const handleNewGameFromHere = useCallback(() => {
    const params = new URLSearchParams();
    params.set('moves', JSON.stringify(moves.slice(0, replay.index + 1)));
    params.set('color', side);
    router.push(`/${locale}/games/new/pgn?${params.toString()}`);
  }, [moves, replay.index, locale, router, side]);

  return (
    <div className="space-y-3">
      <BoardFrame expandOnMobile>
        <HorizontalMoveList
          formattedPgn={replay.formattedPgn}
          currentPosition={replay.index}
          onNavigateToPosition={replay.toIndex}
        />

        <MiniBoard
          fen={replay.fen}
          responsive
          rounded={BOARD_RADIUS_EXPAND_ON_MOBILE}
          flipped={effectiveFlipped}
          lastMove={display.lastMove}
          showCoordinates={display.showCoordinates}
        />

        <MoveNavigationRow
          onNavigateToStart={replay.toStart}
          onNavigatePrevious={replay.previous}
          onNavigateNext={replay.next}
          onNavigateToEnd={replay.toEnd}
          isPreviousDisabled={replay.isAtStart}
          isNextDisabled={replay.isAtEnd}
          flip={{ onClick: toggleFlip, label: tCommon('flipBoard') }}
        />
      </BoardFrame>

      {/* Always rendered to prevent CLS, disabled at the starting position
          (where "from here" would just be a new game from the start). */}
      <div className="flex justify-center">
        <Button
          variant="secondary"
          icon={<FaPlusCircle className="w-3 h-3" />}
          onClick={handleNewGameFromHere}
          disabled={replay.isAtStart}
        >
          {t('newGameFromHere')}
        </Button>
      </div>
    </div>
  );
}
