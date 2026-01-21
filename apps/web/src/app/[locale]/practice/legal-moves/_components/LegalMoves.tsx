'use client';

import { useEffect, useState } from 'react';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { PieceType } from '../_lib/types';
import { LegalMovesSetup } from './LegalMovesSetup';

type Props = {
  locale: Locale;
};

const STORAGE_KEY = 'legalMoves_settings';

const defaultPieces: Record<PieceType, boolean> = {
  king: true,
  queen: true,
  rook: true,
  bishop: true,
  knight: true,
};

export function LegalMoves({ locale }: Props) {
  const { preferences } = useGamePreferences();

  const [timeLimit, setTimeLimit] = useState(60);
  const [selectedPieces, setSelectedPieces] = useState<Record<PieceType, boolean>>(defaultPieces);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage after mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.timeLimit) setTimeLimit(settings.timeLimit);
        if (settings.selectedPieces) setSelectedPieces(settings.selectedPieces);
      } catch {
        // Ignore invalid JSON in localStorage
      }
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage when they change (only after initial load)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ timeLimit, selectedPieces }));
    }
  }, [timeLimit, selectedPieces, isLoaded]);

  const togglePiece = (piece: PieceType) => {
    setSelectedPieces((prev) => ({ ...prev, [piece]: !prev[piece] }));
  };

  return (
    <LegalMovesSetup
      locale={locale}
      timeLimit={timeLimit}
      selectedPieces={selectedPieces}
      onTimeLimitChange={setTimeLimit}
      onPieceToggle={togglePiece}
      boardTheme={preferences.boardTheme}
    />
  );
}
