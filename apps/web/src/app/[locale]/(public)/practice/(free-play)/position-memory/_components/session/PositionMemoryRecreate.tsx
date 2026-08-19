'use client';

import { useState } from 'react';

import { Button, FlipBoardButton } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME } from '@/lib/games/board-themes';

import { EditableChessBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard';
import { ProgressBar } from '@/app/[locale]/(public)/practice/_components/ProgressBar';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';

import { useEditableBoardLabels } from '../../../_hooks/use-editable-board-labels';
import type { PositionData } from '../../_lib/types';

type Props = {
  originalPosition: PositionData;
  recreatedPosition: string;
  currentProblemIndex: number;
  problemCount: number;
  boardTheme?: BoardTheme;
  isTutorial?: boolean;
  showSkip?: boolean;
  onPositionChange: (fen: string) => void;
  onSubmit: () => void;
  onViewAgain: () => void;
  onSkip: () => void;
  onQuit: () => void;
};

export function PositionMemoryRecreate({
  originalPosition,
  recreatedPosition,
  currentProblemIndex,
  problemCount,
  boardTheme = DEFAULT_BOARD_THEME,
  isTutorial = false,
  showSkip = true,
  onPositionChange,
  onSubmit,
  onViewAgain,
  onSkip,
  onQuit,
}: Props) {
  const t = useTranslations('practice.positionMemory');

  // Board orientation is a local view preference during recreation — it does
  // not change the answer, only how the solver looks at the board. Seed it from
  // the original position's stored orientation so the board opens the way the
  // position was authored, then let the solver flip freely.
  const [flipped, setFlipped] = useState(originalPosition.isBlackToMove);

  const editableBoardLabels = useEditableBoardLabels('practice.positionMemory');

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-6">
        {/* Progress */}
        {problemCount > 1 && <ProgressBar current={currentProblemIndex + 1} total={problemCount} />}

        {/* Instruction */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-lg text-muted-foreground">{t('recreatePosition')}</p>
          <FlipBoardButton onClick={() => setFlipped((prev) => !prev)} title={t('flipBoard')} />
        </div>

        {/* Chess Board */}
        <EditableChessBoard
          expandBoardOnMobile
          fen={recreatedPosition}
          onFenChange={onPositionChange}
          labels={editableBoardLabels}
          flipped={flipped}
          editable={true}
          preserveTurnInfo={true}
          originalPosition={originalPosition.fen}
          boardTheme={boardTheme}
        />

        {/* Submit Button */}
        <Button onClick={onSubmit} variant="primary" size="lg" fullWidth>
          {t('submit')}
        </Button>
      </div>

      {/* Action Links */}
      {!isTutorial && (
        <div className="flex flex-col items-center gap-2">
          <button onClick={onViewAgain} className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
            {t('viewAgain')}
          </button>
          {showSkip && (
            <button onClick={onSkip} className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
              {t('skip')}
            </button>
          )}
          <button onClick={onQuit} className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
            {t('quit')}
          </button>
        </div>
      )}
    </div>
  );
}
