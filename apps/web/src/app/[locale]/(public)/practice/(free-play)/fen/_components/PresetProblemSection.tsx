'use client';

import { useState } from 'react';

import { BoardFrame } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';

import type { BoardTheme } from '@/lib/games/board-themes';

import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';

import type { PresetPosition } from '../_data/positions';
import presetPositions from '../_data/presetPositions.json';
import { ProblemCountAndShuffle } from './ProblemCountAndShuffle';

type Props = {
  problemCount: number;
  presetCount: number;
  shuffleProblems: boolean;
  boardTheme: BoardTheme;
  onProblemCountChange: (value: number) => void;
  onShuffleChange: (value: boolean) => void;
};

export function PresetProblemSection({
  problemCount,
  presetCount,
  shuffleProblems,
  boardTheme,
  onProblemCountChange,
  onShuffleChange,
}: Props) {
  const t = useTranslations('practice.fen');
  const [previewPreset, setPreviewPreset] = useState<PresetPosition | null>(null);

  return (
    <>
      {/* Preset Problems List */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t('presetDescription')}
        </label>
        <div className="space-y-2">
          {(presetPositions as PresetPosition[]).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setPreviewPreset(previewPreset?.id === preset.id ? null : preset)}
              className={`w-full p-3 text-left rounded-lg border transition-colors ${
                previewPreset?.id === preset.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50 hover:bg-secondary/50'
              }`}
            >
              <span className="font-medium">{preset.title}</span>
            </button>
          ))}
        </div>

        {/* Preview */}
        {previewPreset && (
          <div className="mt-4">
            <BoardFrame>
              <AnimatedChessBoard
                initialFen={previewPreset.fen}
                showCoordinates={true}
                flipped={isBlackToMoveFromFen(previewPreset.fen)}
                boardTheme={boardTheme}
              />
            </BoardFrame>
          </div>
        )}
      </div>

      <ProblemCountAndShuffle
        availableCount={presetCount}
        problemCount={problemCount}
        shuffleProblems={shuffleProblems}
        onProblemCountChange={onProblemCountChange}
        onShuffleChange={onShuffleChange}
      />
    </>
  );
}
