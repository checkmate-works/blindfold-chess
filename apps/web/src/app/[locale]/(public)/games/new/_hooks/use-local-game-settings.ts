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
    // whatever the player picked in /preferences. Editable on the new-game form
    // (CollapsibleGameSettings, when boardVisibility === 'peek') and mid-game via
    // the in-game settings modal.
    peekMode: preferences.peekMode,
    // Same pattern for moveInputMode: snapshot the user's global default at
    // game start. Mid-game switches via the MoveInputPanel toggle accumulate
    // in the change log instead of mutating the global preference.
    moveInputMode: preferences.moveInputMode,
  });

  const handleSettingsChange = (updates: Partial<PerGamePreferences>) => {
    setLocalSettings((prev) => ({ ...prev, ...updates }));
  };

  return { localSettings, handleSettingsChange };
}
