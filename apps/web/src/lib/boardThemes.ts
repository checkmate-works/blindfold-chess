// Board theme definitions for chess board rendering
export type BoardTheme = 'default' | 'lichess' | 'chesscom';

export type BoardThemeColors = {
  light: string; // Tailwind classes for light squares
  dark: string; // Tailwind classes for dark squares
  lightCoordinates: string; // Tailwind classes for coordinates on light squares
  darkCoordinates: string; // Tailwind classes for coordinates on dark squares
};

// Board theme color definitions
export const boardThemes: Record<BoardTheme, BoardThemeColors> = {
  default: {
    light: 'bg-stone-200 dark:bg-stone-300',
    dark: 'bg-stone-600 dark:bg-stone-700',
    lightCoordinates: 'text-stone-700 dark:text-stone-800',
    darkCoordinates: 'text-stone-300 dark:text-stone-200',
  },
  lichess: {
    // Lichess brown theme
    light: 'bg-[#f0d9b5] dark:bg-[#f0d9b5]',
    dark: 'bg-[#b58863] dark:bg-[#b58863]',
    lightCoordinates: 'text-[#b58863] dark:text-[#b58863]',
    darkCoordinates: 'text-[#f0d9b5] dark:text-[#f0d9b5]',
  },
  chesscom: {
    // Chess.com green theme
    light: 'bg-[#eeeed2] dark:bg-[#eeeed2]',
    dark: 'bg-[#769656] dark:bg-[#769656]',
    lightCoordinates: 'text-[#769656] dark:text-[#769656]',
    darkCoordinates: 'text-[#eeeed2] dark:text-[#eeeed2]',
  },
};

// Get theme colors by theme name
export function getBoardThemeColors(theme: BoardTheme): BoardThemeColors {
  return boardThemes[theme];
}
