'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

type Props = {
  timeLimit: number;
  onTimeLimitChange: (value: number) => void;
  labels: {
    timeLimit: string;
    seconds?: string;
  };
  showSeconds?: boolean; // whether to show "seconds" suffix
  formatTime?: (seconds: number) => string; // custom time formatter
};

export function TimeSlider({
  timeLimit,
  onTimeLimitChange,
  labels,
  showSeconds = true,
  formatTime,
}: Props) {
  const t = useTranslations('practice');
  // Default time display
  const getTimeDisplay = () => {
    if (formatTime) {
      return formatTime(timeLimit);
    }
    if (showSeconds) {
      return `${timeLimit} ${labels.seconds || 'seconds'}`;
    }
    return `${timeLimit}`;
  };

  // Format label for min/max values
  const formatLabel = (seconds: number) => {
    if (formatTime) {
      return formatTime(seconds);
    }
    if (seconds < 60) {
      return t('secondsFormat', { seconds });
    }
    const minutes = seconds / 60;
    return t('minutesFormat', { minutes });
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="timeLimit" className="block text-sm font-medium text-foreground">
        {labels.timeLimit}: {getTimeDisplay()}
      </label>
      <div>
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
    </div>
  );
}
