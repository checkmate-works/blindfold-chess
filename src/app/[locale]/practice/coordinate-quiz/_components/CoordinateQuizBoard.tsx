'use client';

import { Square } from 'chess.js';

interface CoordinateQuizBoardProps {
  orientation: 'white' | 'black';
  onSquareClick: (square: Square) => void;
  highlightedSquares?: Record<string, 'correct' | 'incorrect' | 'target'>;
}

export function CoordinateQuizBoard({
  orientation,
  onSquareClick,
  highlightedSquares = {},
}: CoordinateQuizBoardProps) {
  const files =
    orientation === 'white'
      ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
      : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];

  const ranks =
    orientation === 'white'
      ? ['8', '7', '6', '5', '4', '3', '2', '1']
      : ['1', '2', '3', '4', '5', '6', '7', '8'];

  const isLightSquare = (fileIndex: number, rankIndex: number) => {
    return (fileIndex + rankIndex) % 2 === 0;
  };

  const getHighlightColor = (highlight: 'correct' | 'incorrect' | 'target') => {
    switch (highlight) {
      case 'correct':
        return 'bg-green-400 dark:bg-green-600';
      case 'incorrect':
        return 'bg-red-400 dark:bg-red-600';
      case 'target':
        return 'bg-green-500 dark:bg-green-700 ring-2 ring-inset ring-green-600/50 dark:ring-green-800/50';
      default:
        return '';
    }
  };

  return (
    <div className="inline-block w-full max-w-md">
      <div className="relative w-full aspect-square border-2 border-border rounded-lg overflow-hidden shadow-lg">
        {ranks.map((rank, rankIndex) => (
          <div key={rank} className="flex h-[12.5%]">
            {files.map((file, fileIndex) => {
              const square = `${file}${rank}` as Square;
              const isLight = isLightSquare(fileIndex, rankIndex);
              const highlight = highlightedSquares[square];
              const highlightColor = highlight ? getHighlightColor(highlight) : '';

              return (
                <button
                  key={square}
                  onClick={() => onSquareClick(square)}
                  className={`
                    w-[12.5%] h-full relative
                    transition-all duration-200
                    hover:brightness-110 active:brightness-90
                    ${
                      highlightColor ||
                      (isLight
                        ? 'bg-stone-200 dark:bg-stone-300'
                        : 'bg-stone-600 dark:bg-stone-700')
                    }
                  `}
                  aria-label={square}
                ></button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
