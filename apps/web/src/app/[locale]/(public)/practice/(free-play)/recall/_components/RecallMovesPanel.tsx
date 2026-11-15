'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { FormattedPgnMove } from '@blindfold-chess/features/chess-core';
import { FaCheck, FaCopy } from 'react-icons/fa';

import { LichessAnalysisControl } from '@/app/[locale]/(public)/games/play/_components/LichessAnalysisControl';
import { MoveNavigationControls } from '@/app/[locale]/(public)/games/play/_components/MoveNavigationControls';
import {
  PANEL_MOVE_LIST_SCROLL_CLASSES,
  VerticalMoveList,
} from '@/app/[locale]/(public)/games/play/_components/VerticalMoveList';
import { buildLichessAnalysisUrls } from '@/app/[locale]/(public)/games/play/_lib/lichess-analysis-urls';
import { moveNavDisabledState } from '@/app/[locale]/(public)/games/play/_lib/move-nav-disabled-state';
import { formatPgnToText } from '@/app/[locale]/(public)/games/play/_lib/pgn-parser';
import { UI_TIMEOUTS } from '@/app/[locale]/_constants/ui-timeouts';

type Props = {
  formattedPgn: FormattedPgnMove[];
  /**
   * The moves entered so far (what `formattedPgn` shows) — never the full game
   * being recalled, since the Lichess game link carries every move it is given.
   */
  moves: readonly string[];
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
  moves,
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
  // Memoized: building the game URL walks and encodes every entered move.
  const lichessAnalysisUrls = useMemo(
    () =>
      buildLichessAnalysisUrls({
        moves,
        startingFen,
        currentPosition,
        latestFen: currentFen,
        displayFen,
      }),
    [moves, startingFen, currentPosition, currentFen, displayFen]
  );
  const getPgnText = () => formatPgnToText(formattedPgn, startingFen);

  return (
    <div data-tour-id="recall-moves">
      <div className="border border-border rounded-lg">
        {/* Moves Header */}
        <div className="px-4 py-3 bg-muted/30 rounded-t-lg">
          <span className="text-foreground font-medium">{t('moves')}</span>
        </div>

        {/* Moves Content */}
        <div className="p-4 font-mono">
          {formattedPgn.length > 0 ? (
            <>
              <VerticalMoveList
                formattedPgn={formattedPgn}
                currentPosition={currentPosition}
                onNavigateToPosition={onNavigateToPosition}
                className={PANEL_MOVE_LIST_SCROLL_CLASSES}
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
                <LichessAnalysisControl urls={lichessAnalysisUrls} getPgnText={getPgnText} />

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
                    const pgnText = getPgnText();

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
