import type { Game } from '@/lib/types';

export type GameItemDisplayProps = {
  game: Game;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: (gameId: string) => void;
};

export type GameListProps = {
  games: Game[];
  selectedGameIds: Set<string>;
  onToggleGame: (gameId: string) => void;
  isDisabled?: boolean;
  onToggleAll?: () => void;
  isAllSelected?: boolean;
};

export function getStatusStyles(status: Game['status']): string {
  switch (status) {
    case 'win':
      return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
    case 'loss':
      return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
    case 'draw':
      return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
    default:
      return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
  }
}

export function getStatusIcon(status: Game['status']): string {
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
