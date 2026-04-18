import { getBoardThemeColors } from '@/lib/games/board-themes';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

export function useBoardTheme() {
  const { preferences, isLoaded } = useGamePreferences();
  const themeColors = getBoardThemeColors(preferences.boardTheme);

  return {
    themeColors,
    showCoordinates: preferences.showCoordinates,
    isLoaded,
  };
}
