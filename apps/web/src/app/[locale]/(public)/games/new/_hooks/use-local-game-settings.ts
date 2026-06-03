'use client';

import { useState } from 'react';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

export function useLocalGameSettings() {
  const { preferences } = useGamePreferences();
  const [localSettings, setLocalSettings] = useState<PerGamePreferences>({
    boardVisibility: preferences.boardVisibility,
    highlightLastMove: preferences.highlightLastMove,
    showOwnPieces: preferences.showOwnPieces,
    showOpponentPieces: preferences.showOpponentPieces,
    pieceShapeMode: preferences.pieceShapeMode,
    pieceColors: preferences.pieceColors,
    // Snapshot the user's global moveInputMode default at
    // game start. Mid-game switches via the MoveInputPanel toggle accumulate
    // in the change log instead of mutating the global preference.
    moveInputMode: preferences.moveInputMode,
  });

  const handleSettingsChange = (updates: Partial<PerGamePreferences>) => {
    setLocalSettings((prev) => ({ ...prev, ...updates }));
  };

  return { localSettings, handleSettingsChange };
}
