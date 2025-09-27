'use client';

import { formatTime } from '../_lib/coordinate-quiz';
import type { BoardOrientation } from '../_lib/coordinate-quiz';
import { TimeSlider } from '../../_components/TimeSlider';
import type { Locale } from '../../../_lib/types';

interface CoordinateQuizSettingsProps {
  timeLimit: number;
  boardOrientation: BoardOrientation;
  onTimeLimitChange: (time: number) => void;
  onBoardOrientationChange: (orientation: BoardOrientation) => void;
  locale?: Locale;
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
  locale = 'en',
  translations,
}: CoordinateQuizSettingsProps) {
  return (
    <div className="space-y-6">
      {/* Time Limit */}
      <TimeSlider
        timeLimit={timeLimit}
        onTimeLimitChange={onTimeLimitChange}
        translations={{
          timeLimit: translations.timeLimit,
        }}
        showSeconds={false}
        formatTime={formatTime}
        locale={locale}
      />

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
