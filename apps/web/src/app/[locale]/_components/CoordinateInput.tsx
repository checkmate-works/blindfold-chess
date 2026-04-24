'use client';

type Props = {
  selectedFiles?: Set<string>;
  selectedRanks?: Set<string>;
  onFileToggle?: (file: string) => void;
  onRankToggle?: (rank: string) => void;
  showFiles?: boolean;
  showRanks?: boolean;
  disabledFile?: (file: string) => boolean;
  disabledRank?: (rank: string) => boolean;
  className?: string;
};

export function CoordinateInput({
  selectedFiles = new Set(),
  selectedRanks = new Set(),
  onFileToggle,
  onRankToggle,
  showFiles = true,
  showRanks = true,
  disabledFile,
  disabledRank,
  className = '',
}: Props) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* File Selection Row */}
      {showFiles && (
        <div className="flex gap-1 justify-center w-full">
          {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((file) => (
            <button
              key={file}
              type="button"
              onClick={() => onFileToggle?.(file)}
              disabled={disabledFile?.(file)}
              className={`flex-1 min-w-0 h-9 rounded-md font-mono text-lg transition-colors border ${
                selectedFiles.has(file)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted border-border disabled:opacity-20 disabled:cursor-not-allowed'
              }`}
            >
              {file}
            </button>
          ))}
        </div>
      )}

      {/* Rank Selection Row */}
      {showRanks && (
        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex gap-1 justify-center w-full">
            {['1', '2', '3', '4', '5', '6', '7', '8'].map((rank) => (
              <button
                key={rank}
                type="button"
                onClick={() => onRankToggle?.(rank)}
                disabled={disabledRank?.(rank)}
                className={`flex-1 min-w-0 h-9 rounded-md font-mono text-lg transition-colors border ${
                  selectedRanks.has(rank)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-border disabled:opacity-20 disabled:cursor-not-allowed'
                }`}
              >
                {rank}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
