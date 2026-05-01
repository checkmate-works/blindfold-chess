import type { BoardTheme } from '@blindfold-chess/types';

export type { BoardTheme };

export const DEFAULT_BOARD_THEME: BoardTheme = 'lichess';

// Tailwind classes mapping for Web (Web-specific implementation)
export type TailwindThemeClasses = {
  light: string;
  dark: string;
  lightCoordinates: string;
  darkCoordinates: string;
};

/*
 * Board theme Tailwind class definitions.
 *
 * The actual hex values are owned by `boardThemeColors` in
 * @blindfold-chess/ui (`packages/ui/src/theme/colors.ts`) and emitted as
 * CSS custom properties (--color-board-<theme>-<role>) by
 * `generateThemeCSS()`. The arbitrary-value class strings below are
 * static literals (so Tailwind's static analysis can find them) that
 * resolve to the colors injected at runtime — there are no hex codes
 * duplicated here.
 *
 * The `monotone` theme intentionally uses Tailwind's `stone-*` palette
 * (rather than the CSS variables) because that theme has light/dark-mode
 * variants that depend on the document's color scheme; the lichess and
 * chesscom themes do not vary with light/dark mode.
 */
const boardThemes: Record<BoardTheme, TailwindThemeClasses> = {
  lichess: {
    // Lichess brown theme — see boardThemeColors.lichess in @blindfold-chess/ui
    light: 'bg-[var(--color-board-lichess-light)] dark:bg-[var(--color-board-lichess-light)]',
    dark: 'bg-[var(--color-board-lichess-dark)] dark:bg-[var(--color-board-lichess-dark)]',
    lightCoordinates:
      'text-[var(--color-board-lichess-light-text)] dark:text-[var(--color-board-lichess-light-text)]',
    darkCoordinates:
      'text-[var(--color-board-lichess-dark-text)] dark:text-[var(--color-board-lichess-dark-text)]',
  },
  chesscom: {
    // Chess.com green theme — see boardThemeColors.chesscom in @blindfold-chess/ui
    light: 'bg-[var(--color-board-chesscom-light)] dark:bg-[var(--color-board-chesscom-light)]',
    dark: 'bg-[var(--color-board-chesscom-dark)] dark:bg-[var(--color-board-chesscom-dark)]',
    lightCoordinates:
      'text-[var(--color-board-chesscom-light-text)] dark:text-[var(--color-board-chesscom-light-text)]',
    darkCoordinates:
      'text-[var(--color-board-chesscom-dark-text)] dark:text-[var(--color-board-chesscom-dark-text)]',
  },
  monotone: {
    light: 'bg-stone-200 dark:bg-stone-300',
    dark: 'bg-stone-600 dark:bg-stone-700',
    lightCoordinates: 'text-stone-700 dark:text-stone-800',
    darkCoordinates: 'text-stone-300 dark:text-stone-200',
  },
};

// Get theme Tailwind classes by theme name
export function getBoardThemeColors(theme: BoardTheme): TailwindThemeClasses {
  return boardThemes[theme];
}
