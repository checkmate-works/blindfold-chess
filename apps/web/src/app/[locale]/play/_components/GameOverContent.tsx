'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import type { AlgebraicNotation, Side } from '@blindfold-chess/core';
import { FaChartLine, FaEye, FaPlus } from 'react-icons/fa';

import type { SkillLevel } from '@/lib/types';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { FormattedPgn, FormattedPgnMove } from '../_lib/pgn-parser';

type Props = {
  locale: Locale;
  playerResult: 'win' | 'loss' | 'draw';
  playerSide: Side;
  skillLevel: SkillLevel;
  moves: AlgebraicNotation[];
  formattedPgn: FormattedPgn;
  startingFen?: string;
  initialGameId?: string;
  onShowBoard: () => void;
};

/**
 * Component displayed when the game is over.
 *
 * Shows:
 * - Game result (win/loss/draw)
 * - Show board button
 * - New game button
 * - Postmortem analysis button
 */
export function GameOverContent({
  locale,
  playerResult,
  playerSide,
  skillLevel,
  moves,
  formattedPgn,
  startingFen,
  initialGameId,
  onShowBoard,
}: Props) {
  const t = useTranslations('play');
  const router = useRouter();

  const handleNewGame = () => {
    window.location.href = `/${locale}/game/new`;
  };

  const handlePostmortem = () => {
    // Create PGN from moves
    const pgnMoves = formattedPgn
      .map((move: FormattedPgnMove) => {
        const moveNumber = `${move.moveNumber}.`;
        const movePair = move.blackMove
          ? `${moveNumber} ${move.whiteMove} ${move.blackMove}`
          : `${moveNumber} ${move.whiteMove}`;
        return movePair;
      })
      .join(' ');

    const params = new URLSearchParams();
    params.set('pgn', pgnMoves);
    params.set('color', playerSide);
    params.set('autoOpponent', 'true');

    // Pass custom starting FEN if present
    if (startingFen) {
      params.set('fen', startingFen);
    }

    // Pass game parameters to allow returning to the exact game state
    if (initialGameId) {
      params.set('gameId', initialGameId);
    }
    params.set('skillLevel', skillLevel.toString());
    params.set('moves', JSON.stringify(moves));

    router.push(`/${locale}/play/postmortem?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Game Result */}
      <div className="text-center">
        <p className="text-lg font-bold">
          {playerResult === 'win' && (
            <span className="text-green-600 dark:text-green-400">✓ {t('youWin')}</span>
          )}
          {playerResult === 'loss' && (
            <span className="text-red-600 dark:text-red-400">✗ {t('youLose')}</span>
          )}
          {playerResult === 'draw' && (
            <span className="text-yellow-600 dark:text-yellow-400">= {t('draw')}</span>
          )}
        </p>
      </div>

      {/* Show Board Button */}
      <div className="flex gap-4 md:gap-2 justify-center">
        <button
          onClick={onShowBoard}
          className="px-4 py-2 border border-border rounded-md hover:bg-muted flex items-center justify-center gap-2"
          title={t('showBoard')}
        >
          <FaEye className="w-4 h-4" />
          <span className="hidden md:inline">{t('showBoard')}</span>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <Button
          variant="primary"
          size="lg"
          icon={<FaPlus className="w-5 h-5" />}
          onClick={handleNewGame}
          className="w-full rounded-xl font-medium"
        >
          {t('newGame')}
        </Button>
        {moves.length > 0 && (
          <Button
            variant="secondary"
            size="lg"
            icon={<FaChartLine className="w-5 h-5" />}
            onClick={handlePostmortem}
            className="w-full rounded-xl font-medium"
          >
            {t('postmortem')}
          </Button>
        )}
      </div>
    </div>
  );
}
