import type { ReactElement, ReactNode } from 'react';

import { FaCheck, FaStar } from 'react-icons/fa';

export type { EvaluationMark } from './evaluation-types';

type EvaluationIconSize = 'sm' | 'md';

const sizeClasses: Record<EvaluationIconSize, { container: string; icon: string; text: string }> = {
  sm: { container: 'w-4 h-4', icon: 'w-2 h-2', text: 'text-[10px]' },
  md: { container: 'w-5 h-5', icon: 'w-2.5 h-2.5', text: 'text-[11px]' },
};

function EvaluationBadge({
  bgColor,
  classes,
  children,
}: {
  bgColor: string;
  classes: { container: string; text: string };
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center ${classes.container} rounded-full ${bgColor} text-white ${classes.text} font-bold`}
    >
      {children}
    </span>
  );
}

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

  if (isMate || loss <= 20) {
    return (
      <EvaluationBadge bgColor="bg-success" classes={classes}>
        <FaStar className={`${classes.icon} text-white`} />
      </EvaluationBadge>
    );
  }
  if (loss <= 50) {
    return (
      <EvaluationBadge bgColor="bg-success" classes={classes}>
        <FaCheck className={`${classes.icon} text-white`} />
      </EvaluationBadge>
    );
  }
  if (loss <= 100) {
    return (
      <EvaluationBadge bgColor="bg-warning" classes={classes}>
        ?!
      </EvaluationBadge>
    );
  }
  if (loss <= 300) {
    return (
      <EvaluationBadge bgColor="bg-caution" classes={classes}>
        ?
      </EvaluationBadge>
    );
  }
  return (
    <EvaluationBadge bgColor="bg-destructive" classes={classes}>
      ??
    </EvaluationBadge>
  );
}
