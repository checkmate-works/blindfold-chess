import { isLightSquare } from '@blindfold-chess/features/common';

import { roundedClass } from './BoardLayout';

type Props = {
  className?: string;
  /** Same contract as `BoardLayout`'s: boolean, or a radius utility used verbatim. */
  rounded?: boolean | string;
};

const ROWS = 8;
const COLS = 8;

export function BoardSkeleton({ className = '', rounded = true }: Props) {
  return (
    <div className={`w-full ${className}`}>
      <div
        className={`relative w-full aspect-square overflow-hidden animate-pulse ${roundedClass(rounded)}`}
      >
        {Array.from({ length: ROWS }, (_, rowIndex) => (
          <div key={rowIndex} className="flex h-[12.5%]">
            {Array.from({ length: COLS }, (_, colIndex) => {
              const isLight = isLightSquare(colIndex, rowIndex);
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
