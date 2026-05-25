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
    // Seed peekMode from the current global so the new-game snapshot inherits
    // whatever the player picked in /preferences. Editable only mid-game via
    // the in-game settings modal — there is no peek-mode control on the
    // new-game form by design.
    peekMode: preferences.peekMode,
  });

  const handleSettingsChange = (updates: Partial<PerGamePreferences>) => {
    setLocalSettings((prev) => ({ ...prev, ...updates }));
  };

  return { localSettings, handleSettingsChange };
}
