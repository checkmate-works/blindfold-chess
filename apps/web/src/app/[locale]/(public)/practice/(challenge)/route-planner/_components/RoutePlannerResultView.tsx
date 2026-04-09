'use client';

import { Fragment } from 'react';

import { BoardSkeleton, Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaArrowRight, FaRedo } from 'react-icons/fa';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import type { PieceType } from '../_lib/utils';
import { RoutePlannerBoard } from './RoutePlannerBoard';

type Props = {
  problem: { piece: PieceType; start: string; end: string };
  result: { success: boolean; shortestPath: string[]; message?: string };
  moves: string[];
  highlightedPathIndex: number | null;
  onHoverPathIndex: (index: number | null) => void;
  onLockPathIndex: (index: number) => void;
  onNextProblem: () => void;
  isTraining: boolean;
  isLastProblem: boolean;
  hideNextButton?: boolean;
};

export function RoutePlannerResultView({
  problem,
  result,
  moves,
  highlightedPathIndex,
  onHoverPathIndex,
  onLockPathIndex,
  onNextProblem,
  isTraining,
  isLastProblem,
  hideNextButton = false,
}: Props) {
  const t = useTranslations('practice.routePlanner');
  const { preferences, isLoaded } = useGamePreferences();

  return (
    <div className="space-y-6">
      {/* Result Message Section */}
      <div className="text-center py-2">
        <h3
          className={`text-lg font-bold mb-2 ${result.success ? 'text-success' : 'text-destructive'}`}
        >
          {result.message}
        </h3>

        {!result.success && (
          <div className="mt-4 text-left p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium text-muted-foreground mb-2">{t('shortestPath')}</h4>
            <div className="flex flex-wrap items-center gap-1">
              {result.shortestPath.map((sq, i) => (
                <Fragment key={i}>
                  {i > 0 && <FaArrowRight size={10} className="text-muted-foreground/50 mx-0.5" />}
                  {i === 0 || i === result.shortestPath.length - 1 ? (
                    <span className="font-mono text-sm font-bold px-1">{sq}</span>
                  ) : (
                    <button
                      className={`font-mono text-xs px-2 py-1 rounded border transition-colors cursor-pointer ${
                        highlightedPathIndex === i
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background hover:bg-muted border-border'
                      }`}
                      onMouseEnter={() => onHoverPathIndex(i)}
                      onMouseLeave={() => onHoverPathIndex(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onLockPathIndex(i);
                      }}
                    >
                      {sq}
                    </button>
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Visual Board Result */}
      <div className="flex justify-center">
        <div className="w-full max-w-sm">
          {!isLoaded ? (
            <BoardSkeleton />
          ) : (
            <RoutePlannerBoard
              startSquare={problem.start}
              targetSquare={problem.end}
              piece={problem.piece}
              path={
                highlightedPathIndex !== null
                  ? result.shortestPath.slice(0, highlightedPathIndex + 1)
                  : [problem.start, ...moves]
              }
              boardTheme={preferences.boardTheme}
              highlightedSquare={
                highlightedPathIndex !== null ? result.shortestPath[highlightedPathIndex] : null
              }
            />
          )}
        </div>
      </div>

      {!hideNextButton && (
        <div className="flex gap-4">
          <Button onClick={onNextProblem} variant="primary" className="flex-1">
            <FaRedo className="mr-2" />
            {isTraining ? t('nextProblem') : isLastProblem ? t('finish') : t('nextProblem')}
          </Button>
        </div>
      )}
    </div>
  );
}
