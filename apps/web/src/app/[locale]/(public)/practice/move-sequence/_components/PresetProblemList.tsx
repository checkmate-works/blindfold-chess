'use client';

import { useState } from 'react';

import { BoardSkeleton, ChessBoard } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaPlay } from 'react-icons/fa';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { presetOpenings } from '../_data/presetOpenings';
import { usePresetPreview } from '../_hooks/use-preset-preview';

type Props = {
  selectedPresetId: string | null;
  onSelectPreset: (id: string) => void;
};

export function PresetProblemList({ selectedPresetId, onSelectPreset }: Props) {
  const t = useTranslations('practice.moveSequence');
  const { preferences, isLoaded } = useGamePreferences();
  const [showPreview, setShowPreview] = useState(true);

  const {
    previewFen,
    previewMoveIndex,
    isPlayingPreview,
    lastMove,
    selectedPresetData,
    handlePlayPreview,
  } = usePresetPreview(selectedPresetId);

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">
        {t('presetDescription')}
      </label>
      <div className="space-y-2">
        {presetOpenings.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => {
              if (selectedPresetId === preset.id) {
                setShowPreview(!showPreview);
              } else {
                onSelectPreset(preset.id);
                setShowPreview(true);
              }
            }}
            className={`w-full p-3 text-left rounded-lg border transition-colors ${
              selectedPresetId === preset.id && showPreview
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 hover:bg-secondary/50'
            }`}
          >
            <span className="font-medium">{preset.title}</span>
          </button>
        ))}
      </div>

      {/* Preview Content */}
      {selectedPresetData && showPreview && (
        <div className="mt-4">
          <div className="max-w-xs mx-auto">
            <div className="relative">
              {!isLoaded ? (
                <BoardSkeleton />
              ) : (
                <ChessBoard
                  fen={previewFen || selectedPresetData.startFen}
                  showCoordinates={true}
                  flipped={false}
                  boardTheme={preferences.boardTheme}
                  lastMove={preferences.highlightLastMove ? lastMove : null}
                />
              )}

              {/* Play button overlay */}
              {isLoaded && !isPlayingPreview && previewMoveIndex < 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md">
                  <button
                    onClick={handlePlayPreview}
                    className="bg-white/90 hover:bg-white text-foreground rounded-full p-4 shadow-lg transition-all hover:scale-110"
                    aria-label={t('play')}
                  >
                    <FaPlay className="w-6 h-6 ml-0.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Move display */}
          <div className="mt-3 bg-secondary/30 rounded-lg p-3">
            <p className="text-sm text-muted-foreground mb-1">{t('moves')}</p>
            <p className="font-mono text-sm">
              {selectedPresetData.moves.map((move, i) => (
                <span
                  key={i}
                  className={i <= previewMoveIndex ? 'text-foreground' : 'text-muted-foreground'}
                >
                  {i % 2 === 0 && (
                    <span className="text-muted-foreground">{Math.floor(i / 2) + 1}. </span>
                  )}
                  {move}{' '}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
