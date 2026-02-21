'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import {
  FaCheck,
  FaChevronDown,
  FaCopy,
  FaExternalLinkAlt,
  FaPlay,
  FaPlusCircle,
} from 'react-icons/fa';

import { fenToLichessUrl } from '@/lib/lichess';

import { formatPgnToText } from '../_lib';
import type { FormattedPgn, FormattedPgnMove } from '../_lib';
import { MoveNavigationControls } from './MoveNavigationControls';

type Props = {
  formattedPgn: FormattedPgn;
  currentPosition: number;
  movesLength: number;
  currentFen: string;
  displayFen: string | null;
  startingFen?: string;
  gameInProgress: boolean;
  onNavigateToPosition: (position: number) => void;
  onNavigateToStart: () => void;
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  onNavigateToEnd: () => void;
  onRestartFromPosition: (position: number) => void;
  onNewGameFromPosition: (position: number) => void;
};

/**
 * Panel component for displaying and navigating through game moves.
 *
 * Features:
 * - Collapsible move list
 * - Click-to-navigate on individual moves
 * - Navigation controls (start, prev, next, end)
 * - Restart/New game from selected position
 * - Analyze on Lichess
 * - Copy PGN/FEN
 */
export function MovesPanel({
  formattedPgn,
  currentPosition,
  movesLength,
  currentFen,
  displayFen,
  startingFen,
  gameInProgress,
  onNavigateToPosition,
  onNavigateToStart,
  onNavigatePrevious,
  onNavigateNext,
  onNavigateToEnd,
  onRestartFromPosition,
  onNewGameFromPosition,
}: Props) {
  const t = useTranslations('play');
  const [isMovesVisible, setIsMovesVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isFenCopied, setIsFenCopied] = useState(false);

  const handleCopyPgn = () => {
    const pgnText = formatPgnToText(formattedPgn, startingFen);
    navigator.clipboard.writeText(pgnText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleCopyFen = () => {
    // Use the same FEN that is sent to Lichess
    let fenToCopy: string;
    if (currentPosition === -1) {
      // Current position
      fenToCopy = currentFen;
    } else {
      // Historical position
      fenToCopy = displayFen || currentFen;
    }

    navigator.clipboard.writeText(fenToCopy).then(() => {
      setIsFenCopied(true);
      setTimeout(() => setIsFenCopied(false), 2000);
    });
  };

  const handleAnalyzeOnLichess = () => {
    // Get FEN for current position
    let fenToAnalyze: string;
    if (currentPosition === -1 || displayFen === null) {
      // Latest position
      fenToAnalyze = currentFen;
    } else {
      // Historical position
      fenToAnalyze = displayFen;
    }
    const lichessUrl = fenToLichessUrl(fenToAnalyze);
    window.open(lichessUrl, '_blank');
  };

  return (
    <div className="bg-card rounded-lg shadow-lg">
      {/* Moves Toggle Header */}
      <button
        onClick={() => setIsMovesVisible(!isMovesVisible)}
        className={`w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-border/50 focus:ring-inset rounded-t-lg ${!isMovesVisible ? 'rounded-b-lg' : ''}`}
        aria-expanded={isMovesVisible}
      >
        <div className="flex items-center justify-between">
          <span className="text-foreground">{t('moves')}</span>
          <FaChevronDown
            className={`w-5 h-5 text-muted-foreground transform transition-transform duration-200 ${
              isMovesVisible ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Moves Content */}
      <div
        className={`transition-all duration-300 ${isMovesVisible ? 'block' : 'hidden'} rounded-b-lg`}
      >
        <div className="p-4 max-h-[70vh] overflow-y-auto font-mono">
          {formattedPgn.length > 0 ? (
            <div className="space-y-0.5">
              {formattedPgn.map((move: FormattedPgnMove) => {
                const whiteIndex = move.whiteMoveIndex;
                const blackIndex = move.blackMoveIndex;
                const isWhiteHighlighted =
                  whiteIndex !== undefined && currentPosition === whiteIndex;
                const isBlackHighlighted =
                  blackIndex !== undefined && currentPosition === blackIndex;

                return (
                  <div key={move.moveNumber} className="flex items-center text-sm">
                    <span className="w-10 text-right pr-2 text-muted-foreground">
                      {move.moveNumber}.
                    </span>
                    {move.whiteMove ? (
                      <span
                        className={`flex-1 px-2 py-0.5 rounded cursor-pointer transition-colors ${
                          isWhiteHighlighted
                            ? 'bg-foreground/15 font-semibold dark:bg-foreground/10'
                            : 'hover:bg-muted/40'
                        }`}
                        onClick={() => whiteIndex !== undefined && onNavigateToPosition(whiteIndex)}
                      >
                        {move.whiteMove}
                      </span>
                    ) : (
                      <span className="flex-1 px-2 py-0.5 text-muted-foreground">...</span>
                    )}
                    <span
                      className={`flex-1 px-2 py-0.5 rounded cursor-pointer transition-colors ${
                        isBlackHighlighted
                          ? 'bg-foreground/15 font-semibold dark:bg-foreground/10'
                          : move.blackMove
                            ? 'hover:bg-muted/40'
                            : ''
                      } ${!move.blackMove ? 'pointer-events-none' : ''}`}
                      onClick={() =>
                        move.blackMove &&
                        blackIndex !== undefined &&
                        onNavigateToPosition(blackIndex)
                      }
                    >
                      {move.blackMove || ''}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No moves yet</p>
          )}

          {/* Navigation Controls */}
          {movesLength > 0 && (
            <div className="mt-4">
              <MoveNavigationControls
                onNavigateToStart={onNavigateToStart}
                onNavigatePrevious={onNavigatePrevious}
                onNavigateNext={onNavigateNext}
                onNavigateToEnd={onNavigateToEnd}
                isPreviousDisabled={
                  currentPosition === -2 || (currentPosition === -1 && movesLength === 0)
                }
                isNextDisabled={currentPosition === -1}
              />
            </div>
          )}

          {/* Action Buttons */}
          {movesLength > 0 && (
            <div className="mt-4 flex flex-col gap-4">
              {currentPosition !== -1 && currentPosition !== -2 && (
                <>
                  {/* Restart from here button - only show if game is still in progress */}
                  {gameInProgress && (
                    <Button
                      variant="primary"
                      icon={<FaPlay className="w-3 h-3" />}
                      onClick={() => onRestartFromPosition(currentPosition)}
                    >
                      {t('restartFromHere')}
                    </Button>
                  )}
                  {/* New game from here button - always show when navigating moves */}
                  <Button
                    variant="secondary"
                    icon={<FaPlusCircle className="w-3 h-3" />}
                    onClick={() => onNewGameFromPosition(currentPosition)}
                  >
                    {t('newGameFromHere')}
                  </Button>
                </>
              )}

              {/* Analyze on Lichess Button */}
              <Button
                variant="secondary"
                icon={<FaExternalLinkAlt className="w-3 h-3" />}
                onClick={handleAnalyzeOnLichess}
              >
                {t('analyzeOnLichess')}
              </Button>

              {/* Copy PGN Button */}
              <Button
                variant="secondary"
                icon={
                  isCopied ? (
                    <FaCheck className="w-3 h-3 text-green-500" />
                  ) : (
                    <FaCopy className="w-3 h-3" />
                  )
                }
                onClick={handleCopyPgn}
              >
                {isCopied ? t('copied') || 'Copied!' : t('copyPgn')}
              </Button>

              {/* Copy FEN Button */}
              <Button
                variant="secondary"
                icon={
                  isFenCopied ? (
                    <FaCheck className="w-3 h-3 text-green-500" />
                  ) : (
                    <FaCopy className="w-3 h-3" />
                  )
                }
                onClick={handleCopyFen}
              >
                {isFenCopied ? t('copied') || 'Copied!' : t('copyFen')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
