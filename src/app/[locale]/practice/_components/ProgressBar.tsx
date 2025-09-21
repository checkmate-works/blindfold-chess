interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
}

export function ProgressBar({ current, total, className = '' }: ProgressBarProps) {
  const progress = (current / total) * 100;

  return (
    <div className={`mb-8 ${className}`}>
      <div className="flex justify-between text-sm text-muted-foreground mb-2">
        <span>
          {current} / {total}
        </span>
      </div>
      <div className="w-full bg-secondary rounded-full h-2">
        <div
          className="bg-foreground h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
