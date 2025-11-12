'use client';

import { GameListItem } from './GameListItem';
import type { GameListProps } from './types';

export function GameList({
  games,
  selectedGameIds,
  onToggleGame,
  isDisabled = false,
}: GameListProps) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
      <ul className="divide-y divide-border">
        {games.map((game) => {
          const isSelected = selectedGameIds.has(game.id);
          return (
            <GameListItem
              key={game.id}
              game={game}
              isSelected={isSelected}
              isDisabled={isDisabled}
              onToggle={onToggleGame}
            />
          );
        })}
      </ul>
    </div>
  );
}
