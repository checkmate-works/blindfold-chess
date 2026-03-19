'use client';

import { useState } from 'react';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

export function useLocalGameSettings() {
  const { preferences } = useGamePreferences();
  const [localSettings, setLocalSettings] = useState<PerGamePreferences>({
    showBoardButtonInGame: preferences.showBoardButtonInGame,
    highlightLastMove: preferences.highlightLastMove,
    showOwnPieces: preferences.showOwnPieces,
    showOpponentPieces: preferences.showOpponentPieces,
    pieceShapeMode: preferences.pieceShapeMode,
    pieceColors: preferences.pieceColors,
  });

  const handleSettingsChange = (updates: Partial<PerGamePreferences>) => {
    setLocalSettings((prev) => ({ ...prev, ...updates }));
  };

  return { localSettings, handleSettingsChange };
}
