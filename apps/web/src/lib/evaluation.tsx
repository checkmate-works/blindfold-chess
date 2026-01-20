import type { ReactElement } from 'react';

import { FaCheck, FaStar } from 'react-icons/fa';

export type EvaluationMark = {
  square: string;
  loss: number;
  isMate?: boolean;
};

export type EvaluationIconSize = 'sm' | 'md';

const sizeClasses: Record<EvaluationIconSize, { container: string; icon: string; text: string }> = {
  sm: { container: 'w-4 h-4', icon: 'w-2 h-2', text: 'text-[10px]' },
  md: { container: 'w-5 h-5', icon: 'w-2.5 h-2.5', text: 'text-[11px]' },
};

/**
 * Get evaluation icon based on evaluation loss (chess.com style)
 * @param loss - Centipawn loss from the move
 * @param isMate - Whether this move leads to checkmate
 * @param size - Icon size: 'sm' for move logs, 'md' for board badges
 * @returns ReactElement representing the evaluation icon
 */
export function getEvaluationIcon(
  loss: number,
  isMate: boolean = false,
  size: EvaluationIconSize = 'md'
): ReactElement | null {
  const classes = sizeClasses[size];
  const shadow = size === 'md' ? 'shadow-md' : '';

  if (isMate) {
    // Checkmate - star (same as best move)
    return (
      <span
        className={`inline-flex items-center justify-center ${classes.container} rounded-full bg-green-500 ${shadow}`}
      >
        <FaStar className={`${classes.icon} text-white`} />
      </span>
    );
  }

  if (loss <= 20) {
    // Best move - star with green background
    return (
      <span
        className={`inline-flex items-center justify-center ${classes.container} rounded-full bg-green-500 ${shadow}`}
      >
        <FaStar className={`${classes.icon} text-white`} />
      </span>
    );
  }
  if (loss <= 50) {
    // Good move - checkmark with green background
    return (
      <span
        className={`inline-flex items-center justify-center ${classes.container} rounded-full bg-green-500 ${shadow}`}
      >
        <FaCheck className={`${classes.icon} text-white`} />
      </span>
    );
  }
  if (loss <= 100) {
    // Inaccuracy - ?! with yellow background
    return (
      <span
        className={`inline-flex items-center justify-center ${classes.container} rounded-full bg-yellow-500 text-white ${classes.text} font-bold ${shadow}`}
      >
        ?!
      </span>
    );
  }
  if (loss <= 300) {
    // Mistake - ? with orange background
    return (
      <span
        className={`inline-flex items-center justify-center ${classes.container} rounded-full bg-orange-500 text-white ${classes.text} font-bold ${shadow}`}
      >
        ?
      </span>
    );
  }
  // Blunder - ?? with red background
  return (
    <span
      className={`inline-flex items-center justify-center ${classes.container} rounded-full bg-red-500 text-white ${classes.text} font-bold ${shadow}`}
    >
      ??
    </span>
  );
}
