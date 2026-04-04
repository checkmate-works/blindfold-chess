'use client';

import { useState } from 'react';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { FormattedPgnMove } from '@blindfold-chess/features/chess-core';
import { FaCheck, FaCopy, FaExternalLinkAlt } from 'react-icons/fa';

import { fenToLichessUrl } from '@/lib/lichess';

import { MoveNavigationControls } from '@/app/[locale]/(public)/games/play/_components/MoveNavigationControls';
import { formatPgnToText } from '@/app/[locale]/(public)/games/play/_lib/pgn-parser';
import { UI_TIMEOUTS } from '@/app/[locale]/_constants/ui-timeouts';

type Props = {
  formattedPgn: FormattedPgnMove[];
  currentPosition: number;
  originalMovesLength: number;
  currentFen: string;
  displayFen: string | null;
  startingFen?: string;
  onNavigateToPosition: (pos: number) => void;
  onNavigateToStart: () => void;
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  onNavigateToEnd: () => void;
};

export function PostmortemMovesPanel({
  formattedPgn,
  currentPosition,
  originalMovesLength,
  currentFen,
  displayFen,
  startingFen,
  onNavigateToPosition,
  onNavigateToStart,
  onNavigatePrevious,
  onNavigateNext,
  onNavigateToEnd,
}: Props) {
  const t = useTranslations('postmortem');
  const [isCopied, setIsCopied] = useState(false);
  const [isFenCopied, setIsFenCopied] = useState(false);

  return (
    <div className="lg:col-span-1">
      <div className="bg-card rounded-lg shadow-lg">
        {/* Moves Header */}
        <div className="px-4 py-3 bg-muted/30 rounded-t-lg">
          <span className="text-foreground font-medium">{t('moves')}</span>
        </div>

        {/* Moves Content */}
        <div className="p-4 max-h-[70vh] overflow-y-auto font-mono">
          {formattedPgn.length > 0 ? (
            <>
              <div className="space-y-0.5">
                {formattedPgn.map((move) => {
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
                          onClick={() =>
                            whiteIndex !== undefined && onNavigateToPosition(whiteIndex)
                          }
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

              {/* Navigation Controls */}
              <div className="mt-4">
                <MoveNavigationControls
                  onNavigateToStart={onNavigateToStart}
                  onNavigatePrevious={onNavigatePrevious}
                  onNavigateNext={onNavigateNext}
                  onNavigateToEnd={onNavigateToEnd}
                  isPreviousDisabled={
                    currentPosition === -2 || (currentPosition === -1 && originalMovesLength === 0)
                  }
                  isNextDisabled={currentPosition === -1}
                />
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex flex-col gap-4">
                {/* Analyze on Lichess Button - only show when navigating */}
                {currentPosition !== -1 && currentPosition !== -2 && (
                  <Button
                    variant="secondary"
                    icon={<FaExternalLinkAlt className="w-3 h-3" />}
                    onClick={() => {
                      const fenToAnalyze = displayFen || currentFen;
                      const lichessUrl = fenToLichessUrl(fenToAnalyze);
                      window.open(lichessUrl, '_blank');
                    }}
                  >
                    {t('analyzeOnLichess')}
                  </Button>
                )}

                {/* Copy PGN Button */}
                <Button
                  variant="secondary"
                  icon={
                    isCopied ? (
                      <FaCheck className="w-3 h-3 text-success" />
                    ) : (
                      <FaCopy className="w-3 h-3" />
                    )
                  }
                  onClick={() => {
                    const pgnText = formatPgnToText(formattedPgn, startingFen);

                    navigator.clipboard.writeText(pgnText).then(() => {
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), UI_TIMEOUTS.PGN_COPY_DURATION);
                    });
                  }}
                >
                  {isCopied ? t('copied') || 'Copied!' : t('copyPgn')}
                </Button>

                {/* Copy FEN Button */}
                <Button
                  variant="secondary"
                  icon={
                    isFenCopied ? (
                      <FaCheck className="w-3 h-3 text-success" />
                    ) : (
                      <FaCopy className="w-3 h-3" />
                    )
                  }
                  onClick={() => {
                    const fenToCopy = displayFen || currentFen;

                    navigator.clipboard.writeText(fenToCopy).then(() => {
                      setIsFenCopied(true);
                      setTimeout(() => setIsFenCopied(false), UI_TIMEOUTS.FEN_COPY_DURATION);
                    });
                  }}
                >
                  {isFenCopied ? t('copied') || 'Copied!' : t('copyFen')}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">{t('noMovesYet')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
