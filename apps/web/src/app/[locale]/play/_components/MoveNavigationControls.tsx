type Props = {
  onNavigateToStart: () => void;
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  onNavigateToEnd: () => void;
  isPreviousDisabled: boolean;
  isNextDisabled: boolean;
};

export function MoveNavigationControls({
  onNavigateToStart,
  onNavigatePrevious,
  onNavigateNext,
  onNavigateToEnd,
  isPreviousDisabled,
  isNextDisabled,
}: Props) {
  return (
    <div className="flex justify-center gap-1">
      <button
        onClick={onNavigateToStart}
        className="w-12 h-12 flex items-center justify-center hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent font-mono text-2xl"
        aria-label="Go to start"
        disabled={isPreviousDisabled}
      >
        «
      </button>
      <button
        onClick={onNavigatePrevious}
        className="w-12 h-12 flex items-center justify-center hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent font-mono text-2xl"
        aria-label="Previous move"
        disabled={isPreviousDisabled}
      >
        ‹
      </button>
      <button
        onClick={onNavigateNext}
        className="w-12 h-12 flex items-center justify-center hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent font-mono text-2xl"
        aria-label="Next move"
        disabled={isNextDisabled}
      >
        ›
      </button>
      <button
        onClick={onNavigateToEnd}
        className="w-12 h-12 flex items-center justify-center hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent font-mono text-2xl"
        aria-label="Go to end"
        disabled={isNextDisabled}
      >
        »
      </button>
    </div>
  );
}
