'use client';

import { BoardSkeleton, Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaRedo } from 'react-icons/fa';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import type { PieceType } from '../_lib/pieces';
import { RoutePlannerProblemFeedback } from './RoutePlannerProblemFeedback';

type Props = {
  problem: { piece: PieceType; start: string; end: string };
  result: { success: boolean; shortestPath: string[]; message?: string; skipped?: boolean };
  moves: string[];
  onNextProblem: () => void;
  isTraining: boolean;
  isLastProblem: boolean;
  hideNextButton?: boolean;
};

export function RoutePlannerResultView({
  problem,
  result,
  moves,
  onNextProblem,
  isTraining,
  isLastProblem,
  hideNextButton = false,
}: Props) {
  const t = useTranslations('practice.routePlanner');
  const { preferences, isLoaded } = useGamePreferences();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className={`font-bold ${result.success ? 'text-success' : 'text-destructive'}`}>
          {result.message}
        </h3>
      </div>

      {!isLoaded ? (
        <div className="flex justify-center">
          <div className="w-full max-w-sm">
            <BoardSkeleton />
          </div>
        </div>
      ) : (
        <RoutePlannerProblemFeedback
          piece={problem.piece}
          start={problem.start}
          end={problem.end}
          moves={moves}
          shortestPath={result.shortestPath}
          success={result.success}
          skipped={result.skipped}
          boardTheme={preferences.boardTheme}
        />
      )}

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
