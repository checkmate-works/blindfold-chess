import { useState } from 'react';

import type { Game } from '@/lib/types';

import { GameList } from '@/app/[locale]/games/_components';

import { BulkDeleteActions } from './BulkDeleteActions';

type Props = {
  games: Game[];
  onDelete: (gameIdsToDelete: string[]) => Promise<void>;
  isProcessing: boolean;
};

export function GameSelector({ games, onDelete, isProcessing }: Props) {
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());

  const handleToggleGame = (gameId: string) => {
    const newSelection = new Set(selectedGameIds);
    if (newSelection.has(gameId)) {
      newSelection.delete(gameId);
    } else {
      newSelection.add(gameId);
    }
    setSelectedGameIds(newSelection);
  };

  const handleToggleAll = () => {
    if (areAllSelected) {
      setSelectedGameIds(new Set());
    } else {
      const allGameIds = new Set(games.map((g) => g.id));
      setSelectedGameIds(allGameIds);
    }
  };

  const areAllSelected = games.length > 0 && selectedGameIds.size === games.length;

  return (
    <div className="space-y-6">
      <GameList
        games={games}
        selectedGameIds={selectedGameIds}
        onToggleGame={handleToggleGame}
        isDisabled={isProcessing}
        onToggleAll={handleToggleAll}
        isAllSelected={areAllSelected}
      />

      <BulkDeleteActions
        selectedGameIds={selectedGameIds}
        onDelete={onDelete}
        isProcessing={isProcessing}
      />
    </div>
  );
}
