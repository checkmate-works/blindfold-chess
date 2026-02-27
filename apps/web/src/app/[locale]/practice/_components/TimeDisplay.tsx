import type { ReactNode } from 'react';

type Props = {
  timeRemaining: number; // in seconds
  timeLimit: number; // in seconds
  timeElapsed: number; // in seconds
  labels: {
    timeRemaining: string;
  };
  formatTime?: (seconds: number) => string; // optional custom formatter
  leftContent?: ReactNode; // optional content for the left side (e.g., score)
};

export function TimeDisplay({
  timeRemaining,
  timeLimit,
  timeElapsed,
  labels,
  formatTime,
  leftContent,
}: Props) {
  // Default time formatter
  const defaultFormatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const displayTime = formatTime ? formatTime(timeRemaining) : defaultFormatTime(timeRemaining);

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        {leftContent && <span className="text-sm text-muted-foreground">{leftContent}</span>}
        <span className={`text-sm text-muted-foreground ${!leftContent ? 'ml-auto' : ''}`}>
          {labels.timeRemaining}: {displayTime}
        </span>
      </div>
      <div className="w-full bg-secondary rounded-full h-2">
        <div
          className="bg-foreground h-2 rounded-full transition-all duration-1000"
          style={{ width: `${(timeElapsed / timeLimit) * 100}%` }}
        />
      </div>
    </div>
  );
}
