'use client';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { fenToLichessUrl } from '@blindfold-chess/features/chess-core/fen';
import { FaExternalLinkAlt } from 'react-icons/fa';

import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME } from '@/lib/games/board-themes';

import { ProblemResultActions } from '@/app/[locale]/(public)/practice/(free-play)/_components/ProblemResultActions';
import { RecreationComparison } from '@/app/[locale]/(public)/practice/(free-play)/_components/RecreationComparison';
import { PieceRecreationProgress } from '@/app/[locale]/(public)/practice/_components/PieceRecreationProgress';

import type { PositionAccuracy, PositionData } from '../../_lib/types';

const NAMESPACE = 'practice.positionMemory';

type Props = {
  accuracy: PositionAccuracy;
  originalPosition: PositionData;
  recreatedPosition: string;
  currentProblemIndex: number;
  totalProblems: number;
  boardTheme?: BoardTheme;
  isTutorial?: boolean;
  onNextProblem: () => void;
  onViewResults: () => void;
  onFinishTutorial?: () => void;
};

export function PositionMemoryProblemResult({
  accuracy,
  originalPosition,
  recreatedPosition,
  currentProblemIndex,
  totalProblems,
  boardTheme = DEFAULT_BOARD_THEME,
  isTutorial = false,
  onNextProblem,
  onViewResults,
  onFinishTutorial,
}: Props) {
  const t = useTranslations(NAMESPACE);
  const isLastProblem = currentProblemIndex >= totalProblems - 1;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-col gap-6">
          {/* Accuracy Title */}
          <h2 className="text-2xl font-bold text-center">
            {t('accuracy')}: {accuracy.accuracy.toFixed(1)}% ({accuracy.correctPieces}/
            {accuracy.totalPieces})
          </h2>

          {/* Recreation Progress Bar */}
          <PieceRecreationProgress accuracy={accuracy} namespace={NAMESPACE} />

          <RecreationComparison
            namespace={NAMESPACE}
            originalPosition={originalPosition}
            recreatedPosition={recreatedPosition}
            boardTheme={boardTheme}
            showCoordinates={{ original: false, recreation: true }}
          />

          <ProblemResultActions
            namespace={NAMESPACE}
            isTutorial={isTutorial}
            isLastProblem={isLastProblem}
            onNextProblem={onNextProblem}
            onViewResults={onViewResults}
            onFinishTutorial={onFinishTutorial}
            extraActions={
              <Button
                onClick={() => {
                  const lichessUrl = fenToLichessUrl(originalPosition.fen);
                  window.open(lichessUrl, '_blank');
                }}
                variant="secondary"
                size="lg"
                fullWidth
                icon={<FaExternalLinkAlt className="w-4 h-4" />}
              >
                {t('analyzeOnLichess')}
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
}
