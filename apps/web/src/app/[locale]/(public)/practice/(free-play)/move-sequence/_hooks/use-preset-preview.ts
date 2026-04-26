import { useEffect, useMemo } from 'react';

import { useMovePlayback } from '@/app/[locale]/(public)/practice/_hooks/use-move-playback';

import { presetOpenings } from '../_data/presetOpenings';
import { parseMoveSequence } from '../_lib/pgn-parser';

export function usePresetPreview(selectedPresetId: string | null) {
  const selectedPresetData = useMemo(() => {
    if (!selectedPresetId) return null;
    const preset = presetOpenings.find((p) => p.id === selectedPresetId);
    if (!preset) return null;

    try {
      const result = parseMoveSequence(preset.fen, preset.pgn);
      if (result.success) {
        return {
          startFen: preset.fen,
          moves: result.data.moves,
          pgn: preset.pgn,
        };
      }
      return null;
    } catch {
      return null;
    }
  }, [selectedPresetId]);

  const initialFen = selectedPresetData ? selectedPresetData.startFen : '';
  const moves = selectedPresetData ? selectedPresetData.moves : [];

  const {
    currentFen: previewFen,
    currentMoveIndex: previewMoveIndex,
    isPlaying: isPlayingPreview,
    lastMove,
    play: handlePlayPreview,
    resetPlayback,
  } = useMovePlayback({
    initialFen,
    moves,
    intervalMs: 800,
    autoPlayDelayMs: 300,
  });

  // Reset playback whenever a new preset is selected
  useEffect(() => {
    if (selectedPresetData) {
      resetPlayback();
    }
  }, [selectedPresetData, resetPlayback]);

  return {
    previewFen,
    previewMoveIndex,
    isPlayingPreview,
    lastMove,
    selectedPresetData,
    handlePlayPreview,
  };
}
