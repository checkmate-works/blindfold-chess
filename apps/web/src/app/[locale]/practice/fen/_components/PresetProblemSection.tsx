'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import type { BoardTheme } from '@/lib/boardThemes';

import { AnimatedChessBoard } from '@/app/[locale]/practice/_components/AnimatedChessBoard';

import type { PresetPosition } from '../_data/positions';
import presetPositions from '../_data/presetPositions.json';

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
            <div className="max-w-xs mx-auto">
              <AnimatedChessBoard
                initialFen={previewPreset.fen}
                showCoordinates={true}
                flipped={previewPreset.fen.split(' ')[1] === 'b'}
                boardTheme={boardTheme}
              />
            </div>
          </div>
        )}
      </div>

      {/* Problem Count */}
      <div>
        <label htmlFor="problemCount" className="block text-sm font-medium text-foreground mb-2">
          {t('problemCount')}: {Math.min(problemCount, presetCount)}{' '}
          {Math.min(problemCount, presetCount) > 1 ? t('problems') : ''}
        </label>
        <input
          id="problemCount"
          type="range"
          min="1"
          max={presetCount}
          step="1"
          value={Math.min(problemCount, presetCount)}
          onChange={(e) => onProblemCountChange(parseInt(e.target.value))}
          className="w-full h-2 bg-secondary rounded-md appearance-none cursor-pointer accent-foreground"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>1</span>
          <span>{presetCount}</span>
        </div>
      </div>

      {/* Shuffle Problems */}
      {problemCount > 1 && (
        <div className="flex items-center justify-end gap-3">
          <label htmlFor="shuffle" className="text-sm text-muted-foreground">
            {t('shuffle')}
          </label>
          <button
            id="shuffle"
            type="button"
            role="switch"
            aria-checked={shuffleProblems}
            onClick={() => onShuffleChange(!shuffleProblems)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              shuffleProblems ? 'bg-foreground' : 'bg-secondary'
            }`}
          >
            <span className="sr-only">{t('shuffle')}</span>
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                shuffleProblems ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      )}
    </>
  );
}
