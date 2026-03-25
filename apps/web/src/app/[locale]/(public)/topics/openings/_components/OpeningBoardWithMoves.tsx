'use client';

import { useCallback, useMemo, useState } from 'react';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { getFenAfterMoves, getStartingFen, parsePgn } from '@blindfold-chess/features/chess-core';
import { FaPlusCircle } from 'react-icons/fa';

import { isBlackOpening } from '../_lib/openings';
import { MiniBoard } from './MiniBoard';

type Props = {
  fen: string;
  pgn: string;
};

export function OpeningBoardWithMoves({ fen, pgn }: Props) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('topics.openings');
  const moves = useMemo(() => parsePgn(pgn), [pgn]);

  // -1 = starting position (before any move), 0..moves.length-1 = after that move
  // Initial state: last move (shows opening.fen)
  const [currentMoveIndex, setCurrentMoveIndex] = useState(moves.length - 1);

  const currentFen = useMemo(() => {
    if (currentMoveIndex === -1) {
      return getStartingFen();
    }
    if (currentMoveIndex === moves.length - 1) {
      return fen;
    }
    return getFenAfterMoves(getStartingFen(), moves.slice(0, currentMoveIndex + 1));
  }, [currentMoveIndex, moves, fen]);

  const navigateToStart = useCallback(() => setCurrentMoveIndex(-1), []);
  const navigatePrevious = useCallback(
    () => setCurrentMoveIndex((prev) => Math.max(-1, prev - 1)),
    []
  );
  const navigateNext = useCallback(
    () => setCurrentMoveIndex((prev) => Math.min(moves.length - 1, prev + 1)),
    [moves.length]
  );
  const navigateToEnd = useCallback(() => setCurrentMoveIndex(moves.length - 1), [moves.length]);

  // Group moves into pairs: { moveNumber, whiteMove, blackMove }
  const movePairs = useMemo(() => {
    const pairs: {
      moveNumber: number;
      whiteMove: string;
      whiteMoveIndex: number;
      blackMove?: string;
      blackMoveIndex?: number;
    }[] = [];
    for (let i = 0; i < moves.length; i += 2) {
      pairs.push({
        moveNumber: Math.floor(i / 2) + 1,
        whiteMove: moves[i],
        whiteMoveIndex: i,
        blackMove: moves[i + 1],
        blackMoveIndex: i + 1 < moves.length ? i + 1 : undefined,
      });
    }
    return pairs;
  }, [moves]);

  const handleNewGameFromHere = useCallback(() => {
    const movesToKeep = moves.slice(0, currentMoveIndex + 1);
    const params = new URLSearchParams();
    params.set('moves', JSON.stringify(movesToKeep));
    router.push(`/${locale}/games/new/pgn?${params.toString()}`);
  }, [moves, currentMoveIndex, locale, router]);

  const isPreviousDisabled = currentMoveIndex === -1;
  const isNextDisabled = currentMoveIndex === moves.length - 1;
  const isAtStartingPosition = currentMoveIndex === -1;

  return (
    <div className="space-y-3">
      <div className="max-w-xs mx-auto">
        <MiniBoard fen={currentFen} responsive flipped={isBlackOpening(fen)} />
      </div>

      {/* Navigation Controls */}
      <div className="flex justify-center gap-1">
        <button
          type="button"
          onClick={navigateToStart}
          className="w-10 h-10 flex items-center justify-center hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent font-mono text-xl"
          aria-label="Go to start"
          disabled={isPreviousDisabled}
        >
          &laquo;
        </button>
        <button
          type="button"
          onClick={navigatePrevious}
          className="w-10 h-10 flex items-center justify-center hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent font-mono text-xl"
          aria-label="Previous move"
          disabled={isPreviousDisabled}
        >
          &lsaquo;
        </button>
        <button
          type="button"
          onClick={navigateNext}
          className="w-10 h-10 flex items-center justify-center hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent font-mono text-xl"
          aria-label="Next move"
          disabled={isNextDisabled}
        >
          &rsaquo;
        </button>
        <button
          type="button"
          onClick={navigateToEnd}
          className="w-10 h-10 flex items-center justify-center hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent font-mono text-xl"
          aria-label="Go to end"
          disabled={isNextDisabled}
        >
          &raquo;
        </button>
      </div>

      {/* Move List */}
      {movePairs.length > 0 && (
        <div className="overflow-x-auto">
          <div className="flex items-center gap-1 text-sm whitespace-nowrap justify-center flex-wrap">
            {movePairs.map((pair) => (
              <div key={pair.moveNumber} className="flex items-center gap-0.5">
                <span className="text-muted-foreground text-xs">{pair.moveNumber}.</span>
                <button
                  type="button"
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    currentMoveIndex === pair.whiteMoveIndex
                      ? 'bg-foreground/15 font-semibold'
                      : 'hover:bg-muted/40'
                  }`}
                  onClick={() => setCurrentMoveIndex(pair.whiteMoveIndex)}
                >
                  {pair.whiteMove}
                </button>
                {pair.blackMove && (
                  <button
                    type="button"
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      pair.blackMoveIndex !== undefined && currentMoveIndex === pair.blackMoveIndex
                        ? 'bg-foreground/15 font-semibold'
                        : 'hover:bg-muted/40'
                    }`}
                    onClick={() =>
                      pair.blackMoveIndex !== undefined && setCurrentMoveIndex(pair.blackMoveIndex)
                    }
                  >
                    {pair.blackMove}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New game from here button — always rendered to prevent CLS, disabled at starting position */}
      <div className="flex justify-center">
        <Button
          variant="secondary"
          icon={<FaPlusCircle className="w-3 h-3" />}
          onClick={handleNewGameFromHere}
          disabled={isAtStartingPosition}
        >
          {t('newGameFromHere')}
        </Button>
      </div>
    </div>
  );
}
