'use client';

import { formatTime } from '../_lib/coordinate-quiz';
import type { BoardOrientation } from '../_lib/coordinate-quiz';

interface CoordinateQuizSettingsProps {
  timeLimit: number;
  boardOrientation: BoardOrientation;
  onTimeLimitChange: (time: number) => void;
  onBoardOrientationChange: (orientation: BoardOrientation) => void;
  translations: {
    timeLimit: string;
    boardOrientation: string;
    white: string;
    black: string;
    random: string;
  };
}

export function CoordinateQuizSettings({
  timeLimit,
  boardOrientation,
  onTimeLimitChange,
  onBoardOrientationChange,
  translations,
}: CoordinateQuizSettingsProps) {
  return (
    <div className="space-y-6">
      {/* Time Limit */}
      <div>
        <label htmlFor="timeLimit" className="block text-sm font-medium text-foreground mb-2">
          {translations.timeLimit}: {formatTime(timeLimit)}
        </label>
        <input
          id="timeLimit"
          type="range"
          min="10"
          max="60"
          step="10"
          value={timeLimit}
          onChange={(e) => onTimeLimitChange(parseInt(e.target.value))}
          className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-foreground"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>0:10</span>
          <span>1:00</span>
        </div>
      </div>

      {/* Board Orientation */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {translations.boardOrientation}
        </label>
        <div className="flex gap-2">
          {(['white', 'black', 'random'] as const).map((orientation) => (
            <button
              key={orientation}
              onClick={() => onBoardOrientationChange(orientation)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                boardOrientation === orientation
                  ? 'bg-foreground text-background'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              {translations[orientation]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
