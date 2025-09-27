'use client';

import type { Locale } from '../../_lib/types';

interface TimeSliderProps {
  timeLimit: number;
  onTimeLimitChange: (value: number) => void;
  translations: {
    timeLimit: string;
    seconds?: string;
  };
  showSeconds?: boolean; // whether to show "seconds" suffix
  formatTime?: (seconds: number) => string; // custom time formatter
  locale?: Locale; // for label formatting
}

export function TimeSlider({
  timeLimit,
  onTimeLimitChange,
  translations,
  showSeconds = true,
  formatTime,
  locale = 'en',
}: TimeSliderProps) {
  // Default time display
  const getTimeDisplay = () => {
    if (formatTime) {
      return formatTime(timeLimit);
    }
    if (showSeconds) {
      return `${timeLimit} ${translations.seconds || 'seconds'}`;
    }
    return `${timeLimit}`;
  };

  // Format label for min/max values
  const formatLabel = (seconds: number) => {
    if (formatTime) {
      return formatTime(seconds);
    }
    if (seconds < 60) {
      return locale === 'ja' ? `${seconds}秒` : `${seconds}s`;
    }
    const minutes = seconds / 60;
    return locale === 'ja' ? `${minutes}分` : `${minutes}m`;
  };

  return (
    <div>
      <label htmlFor="timeLimit" className="block text-sm font-medium text-foreground mb-2">
        {translations.timeLimit}: {getTimeDisplay()}
      </label>
      <input
        id="timeLimit"
        type="range"
        min="30"
        max="180"
        step="30"
        value={timeLimit}
        onChange={(e) => onTimeLimitChange(parseInt(e.target.value))}
        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-foreground"
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{formatLabel(30)}</span>
        <span>{formatLabel(180)}</span>
      </div>
    </div>
  );
}
