'use client';

type Props = {
  count: number;
  onCountChange: (value: number) => void;
  labels: {
    count: string;
    unit?: string;
  };
};

export function ProblemCountSlider({ count, onCountChange, labels }: Props) {
  const MIN = 5;
  const MAX = 20;
  const STEP = 5;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="problemCount" className="block text-sm font-medium text-foreground">
        {labels.count}: {count} {labels.unit}
      </label>
      <div>
        <input
          id="problemCount"
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={count}
          onChange={(e) => onCountChange(parseInt(e.target.value))}
          className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-foreground"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{MIN}</span>
          <span>{MAX}</span>
        </div>
      </div>
    </div>
  );
}
