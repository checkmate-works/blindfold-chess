import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ChessGameManager } from '@blindfold-chess/features/chess-core';

import { presetOpenings } from '../_data/presetOpenings';
import { parseMoveSequence } from '../_lib/pgn-parser';

export function usePresetPreview(selectedPresetId: string | null) {
  const [previewFen, setPreviewFen] = useState<string | null>(null);
  const [previewMoveIndex, setPreviewMoveIndex] = useState(-1);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const previewChessRef = useRef<ChessGameManager | null>(null);
  const previewIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Reset preview when preset changes
  useEffect(() => {
    if (selectedPresetData) {
      setPreviewFen(selectedPresetData.startFen);
      setPreviewMoveIndex(-1);
      setIsPlayingPreview(false);
      setLastMove(null);
      previewChessRef.current = new ChessGameManager(selectedPresetData.startFen);
    }
  }, [selectedPresetData]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (previewIntervalRef.current) {
        clearTimeout(previewIntervalRef.current);
      }
    };
  }, []);

  const playNextPreviewMove = useCallback(() => {
    if (!previewChessRef.current || !selectedPresetData) return;

    const nextIndex = previewMoveIndex + 1;

    if (nextIndex >= selectedPresetData.moves.length) {
      setIsPlayingPreview(false);
      if (previewIntervalRef.current) {
        clearTimeout(previewIntervalRef.current);
        previewIntervalRef.current = null;
      }
      return;
    }

    const move = selectedPresetData.moves[nextIndex];
    try {
      const result = previewChessRef.current.move(move);
      setPreviewFen(previewChessRef.current.fen());
      setPreviewMoveIndex(nextIndex);
      setLastMove({ from: result.from, to: result.to });
    } catch {
      setIsPlayingPreview(false);
      if (previewIntervalRef.current) {
        clearTimeout(previewIntervalRef.current);
        previewIntervalRef.current = null;
      }
    }
  }, [previewMoveIndex, selectedPresetData]);

  // Timer effect for preview playback
  useEffect(() => {
    if (isPlayingPreview && previewMoveIndex >= 0 && selectedPresetData) {
      previewIntervalRef.current = setTimeout(playNextPreviewMove, 800);
    }

    return () => {
      if (previewIntervalRef.current) {
        clearTimeout(previewIntervalRef.current);
        previewIntervalRef.current = null;
      }
    };
  }, [isPlayingPreview, previewMoveIndex, selectedPresetData, playNextPreviewMove]);

  const handlePlayPreview = useCallback(() => {
    if (isPlayingPreview || !selectedPresetData) return;

    previewChessRef.current = new ChessGameManager(selectedPresetData.startFen);
    setPreviewFen(selectedPresetData.startFen);
    setPreviewMoveIndex(-1);
    setLastMove(null);
    setIsPlayingPreview(true);

    setTimeout(() => {
      playNextPreviewMove();
    }, 300);
  }, [isPlayingPreview, selectedPresetData, playNextPreviewMove]);

  return {
    previewFen,
    previewMoveIndex,
    isPlayingPreview,
    lastMove,
    selectedPresetData,
    handlePlayPreview,
  };
}
