'use client';

interface PositionMemorySettingsProps {
  timeLimit: number;
  problemCount: number;
  shuffleProblems: boolean;
  maxProblems: number;
  onTimeLimitChange: (value: number) => void;
  onProblemCountChange: (value: number) => void;
  onShuffleChange: (value: boolean) => void;
  translations: {
    timeLimit: string;
    seconds: string;
    problemCount: string;
    problems: string;
    shuffle: string;
  };
}

export function PositionMemorySettings({
  timeLimit,
  problemCount,
  shuffleProblems,
  maxProblems,
  onTimeLimitChange,
  onProblemCountChange,
  onShuffleChange,
  translations,
}: PositionMemorySettingsProps) {
  return (
    <div className="space-y-6">
      {/* Time Limit */}
      <div>
        <label htmlFor="timeLimit" className="block text-sm font-medium text-foreground mb-2">
          {translations.timeLimit}: {timeLimit} {translations.seconds}
        </label>
        <input
          id="timeLimit"
          type="range"
          min="5"
          max="60"
          step="5"
          value={timeLimit}
          onChange={(e) => onTimeLimitChange(parseInt(e.target.value))}
          className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-foreground"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>5s</span>
          <span>60s</span>
        </div>
      </div>

      {/* Problem Count */}
      <div>
        <label htmlFor="problemCount" className="block text-sm font-medium text-foreground mb-2">
          {translations.problemCount}: {problemCount}{' '}
          {problemCount > 1 ? translations.problems : ''}
        </label>
        <input
          id="problemCount"
          type="range"
          min="1"
          max={maxProblems}
          step="1"
          value={problemCount}
          onChange={(e) => onProblemCountChange(parseInt(e.target.value))}
          className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-foreground"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>1</span>
          <span>{maxProblems}</span>
        </div>
      </div>

      {/* Shuffle Problems */}
      {problemCount > 1 && (
        <div className="flex items-center justify-between">
          <label htmlFor="shuffle" className="text-sm font-medium text-foreground">
            {translations.shuffle}
          </label>
          <button
            id="shuffle"
            type="button"
            role="switch"
            aria-checked={shuffleProblems}
            onClick={() => onShuffleChange(!shuffleProblems)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              shuffleProblems ? 'bg-foreground' : 'bg-secondary'
            }`}
          >
            <span className="sr-only">{translations.shuffle}</span>
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                shuffleProblems ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      )}
    </div>
  );
}
