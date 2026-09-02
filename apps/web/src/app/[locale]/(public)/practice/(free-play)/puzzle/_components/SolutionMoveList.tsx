'use client';

import type { ReactNode } from 'react';

import type { PieceColor } from '@blindfold-chess/types';
import { FaTimes } from 'react-icons/fa';

import { CircleMarker } from './CircleMarker';

type Props = {
  moves: string[];
  firstTurn: PieceColor;
  onRemoveLast: () => void;
  removeAriaLabel: string;
  disabled?: boolean;
  /**
   * Optional renderer inserted after the move chip + remove-button affordance
   * within each `<li>`. Used by the puzzle creator form to attach an inline
   * note-input textbox to each move row without duplicating the chip markup.
   *
   * When provided, the list switches from a horizontally-wrapping chip row
   * to a one-row-per-move vertical layout so the injected node has the full
   * row width to render into. When omitted, the component keeps its original
   * `flex-wrap` horizontal layout for read-only callers.
   */
  renderAfter?: (index: number) => ReactNode;
};

export function SolutionMoveList({
  moves,
  firstTurn,
  onRemoveLast,
  removeAriaLabel,
  disabled = false,
  renderAfter,
}: Props) {
  if (moves.length === 0) return null;

  const listClass = renderAfter
    ? 'flex flex-col gap-2 text-sm'
    : 'flex flex-wrap items-center gap-x-3 gap-y-2 text-sm';

  return (
    <ol className={listClass}>
      {moves.map((move, index) => {
        const isWhiteMove = index % 2 === (firstTurn === 'w' ? 0 : 1);
        const isLast = index === moves.length - 1;
        return (
          <li key={index} className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{index + 1}.</span>
            <CircleMarker color={isWhiteMove ? 'w' : 'b'} />
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
            {renderAfter && <div className="flex-1 min-w-0">{renderAfter(index)}</div>}
          </li>
        );
      })}
    </ol>
  );
}
