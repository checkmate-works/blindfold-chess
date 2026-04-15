import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/games/board-themes';

type Props = {
  onAnswer: (color: 'light' | 'dark') => void;
  disabled: boolean;
  labels: {
    white: string;
    black: string;
  };
  boardTheme?: BoardTheme;
};

export function SquareColorAnswerButtons({
  onAnswer,
  disabled,
  labels,
  boardTheme = DEFAULT_BOARD_THEME,
}: Props) {
  const themeColors = getBoardThemeColors(boardTheme);

  return (
    <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
      {/* Light square button */}
      <button
        onClick={() => onAnswer('light')}
        disabled={disabled}
        className={`aspect-square rounded-md border border-border ${themeColors.light} ${themeColors.lightCoordinates} hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center justify-center`}
      >
        <span className="text-lg font-bold">{labels.white}</span>
      </button>

      {/* Dark square button */}
      <button
        onClick={() => onAnswer('dark')}
        disabled={disabled}
        className={`aspect-square rounded-md border border-border ${themeColors.dark} ${themeColors.darkCoordinates} hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center justify-center`}
      >
        <span className="text-lg font-bold">{labels.black}</span>
      </button>
    </div>
  );
}
