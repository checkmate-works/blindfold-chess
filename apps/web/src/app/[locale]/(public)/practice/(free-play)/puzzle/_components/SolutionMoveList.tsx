'use client';

import { FaTimes } from 'react-icons/fa';

type Props = {
  moves: string[];
  firstTurn: 'w' | 'b';
  onRemoveLast: () => void;
  removeAriaLabel: string;
  disabled?: boolean;
};

export function SolutionMoveList({
  moves,
  firstTurn,
  onRemoveLast,
  removeAriaLabel,
  disabled = false,
}: Props) {
  if (moves.length === 0) return null;

  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      {moves.map((move, index) => {
        const isWhiteMove = index % 2 === (firstTurn === 'w' ? 0 : 1);
        const isLast = index === moves.length - 1;
        return (
          <li key={index} className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{index + 1}.</span>
            <span aria-hidden className="text-base leading-none">
              {isWhiteMove ? '⚪' : '⚫'}
            </span>
            <span className="font-mono text-foreground">{move}</span>
            {isLast && (
              <button
                type="button"
                onClick={onRemoveLast}
                disabled={disabled}
                aria-label={removeAriaLabel}
                className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaTimes className="h-2.5 w-2.5" />
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
