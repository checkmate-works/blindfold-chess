'use client';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { fenToLichessUrl } from '@blindfold-chess/features/chess-core/fen';
import { FaExternalLinkAlt } from 'react-icons/fa';

import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME } from '@/lib/games/board-themes';

import { ProblemRecreationSections } from '@/app/[locale]/(public)/practice/(free-play)/_components/ProblemRecreationSections';

import type { PositionAccuracy, PositionData } from '../../_lib/types';

const NAMESPACE = 'practice.positionMemory';

type Props = {
  accuracy: PositionAccuracy;
  originalPosition: PositionData;
  recreatedPosition: string;
  currentProblemIndex: number;
  totalProblems: number;
  boardTheme?: BoardTheme;
  showCoordinates?: boolean;
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
  showCoordinates = true,
  isTutorial = false,
  onNextProblem,
  onViewResults,
  onFinishTutorial,
}: Props) {
  const t = useTranslations(NAMESPACE);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-col gap-6">
          {/* Accuracy Title */}
          <h2 className="text-2xl font-bold text-center">
            {t('accuracy')}: {accuracy.accuracy.toFixed(1)}% ({accuracy.correctPieces}/
            {accuracy.totalPieces})
          </h2>

          <ProblemRecreationSections
            namespace={NAMESPACE}
            accuracy={accuracy}
            originalPosition={originalPosition}
            recreatedPosition={recreatedPosition}
            currentProblemIndex={currentProblemIndex}
            totalProblems={totalProblems}
            boardTheme={boardTheme}
            showCoordinates={showCoordinates}
            isTutorial={isTutorial}
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
