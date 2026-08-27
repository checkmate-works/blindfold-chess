'use client';

import { useState } from 'react';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { FormattedPgnMove } from '@blindfold-chess/features/chess-core';
import { fenToLichessUrl } from '@blindfold-chess/features/chess-core/fen';
import { FaCheck, FaCopy, FaExternalLinkAlt } from 'react-icons/fa';

import { MoveNavigationControls } from '@/app/[locale]/(public)/games/play/_components/MoveNavigationControls';
import { VerticalMoveList } from '@/app/[locale]/(public)/games/play/_components/VerticalMoveList';
import { moveNavDisabledState } from '@/app/[locale]/(public)/games/play/_lib/move-nav-disabled-state';
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

export function RecallMovesPanel({
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
  const t = useTranslations('recall');
  const [isCopied, setIsCopied] = useState(false);
  const [isFenCopied, setIsFenCopied] = useState(false);

  return (
    <div data-tour-id="recall-moves">
      <div className="border border-border rounded-lg">
        {/* Moves Header */}
        <div className="px-4 py-3 bg-muted/30 rounded-t-lg">
          <span className="text-foreground font-medium">{t('moves')}</span>
        </div>

        {/* Moves Content */}
        <div className="p-4 max-h-[70vh] overflow-y-auto font-mono">
          {formattedPgn.length > 0 ? (
            <>
              <VerticalMoveList
                formattedPgn={formattedPgn}
                currentPosition={currentPosition}
                onNavigateToPosition={onNavigateToPosition}
              />

              {/* Navigation Controls */}
              <div className="mt-4">
                <MoveNavigationControls
                  onNavigateToStart={onNavigateToStart}
                  onNavigatePrevious={onNavigatePrevious}
                  onNavigateNext={onNavigateNext}
                  onNavigateToEnd={onNavigateToEnd}
                  {...moveNavDisabledState(currentPosition, originalMovesLength)}
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
