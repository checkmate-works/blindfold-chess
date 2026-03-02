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
