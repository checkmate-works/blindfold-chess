import type { GameOutcome } from '@/lib/types';

export { formatLastMove } from '@blindfold-chess/features/chess-core';

export function getStatusStyles(status: GameOutcome): string {
  switch (status) {
    case 'win':
      return 'text-success bg-success/10';
    case 'loss':
      return 'text-destructive bg-destructive/10';
    case 'draw':
      return 'text-warning bg-warning/10';
    default:
      return 'text-info bg-info/10';
  }
}

export function getStatusIcon(status: GameOutcome): string {
  switch (status) {
    case 'win':
      return '✓';
    case 'loss':
      return '✗';
    case 'draw':
      return '=';
    default:
      return '⏸';
  }
}
