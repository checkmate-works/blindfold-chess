'use client';

type Props = {
  className?: string;
  rounded?: boolean;
};

const ROWS = 8;
const COLS = 8;

export function BoardSkeleton({ className = '', rounded = true }: Props) {
  return (
    <div className={`w-full ${className}`}>
      <div
        className={`relative w-full aspect-square border border-border overflow-hidden animate-pulse ${rounded ? 'rounded-md' : ''}`}
      >
        {Array.from({ length: ROWS }, (_, rowIndex) => (
          <div key={rowIndex} className="flex h-[12.5%]">
            {Array.from({ length: COLS }, (_, colIndex) => {
              const isLight = (rowIndex + colIndex) % 2 === 0;
              return (
                <div
                  key={colIndex}
                  className={`w-[12.5%] h-full ${isLight ? 'bg-muted' : 'bg-muted-foreground/30'}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
