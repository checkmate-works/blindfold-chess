'use client';

import { FaExchangeAlt } from 'react-icons/fa';

type Props = {
  onClick: () => void;
  title: string;
  className?: string;
};

/**
 * Standardised board-flip button used across all chess board views.
 *
 * Renders a vertically-oriented exchange icon (`FaExchangeAlt rotate-90`)
 * matching the `games/play` appearance. The button adopts either the
 * caller-supplied `className` or the default standalone style (bordered
 * rounded square).
 */
export function FlipBoardButton({ onClick, title, className }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        className ?? 'p-2 border border-border rounded-md hover:bg-muted transition-colors'
      }
      title={title}
    >
      <FaExchangeAlt className="w-4 h-4 rotate-90" />
    </button>
  );
}
