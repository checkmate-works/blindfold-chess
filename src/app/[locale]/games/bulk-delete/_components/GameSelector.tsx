'use client';

import { useState } from 'react';

import type { Game } from '@/lib/types';

import { GameList } from '@/app/[locale]/games/_components';

import { BulkDeleteActions } from './BulkDeleteActions';

type Props = {
  games: Game[];
  onDelete: (gameIdsToDelete: string[]) => Promise<void>;
  onCancel: () => void;
  isProcessing: boolean;
};

export function GameSelector({ games, onDelete, onCancel, isProcessing }: Props) {
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

  return (
    <div className="space-y-6">
      <GameList
        games={games}
        selectedGameIds={selectedGameIds}
        onToggleGame={handleToggleGame}
        isDisabled={isProcessing}
      />

      <BulkDeleteActions
        selectedGameIds={selectedGameIds}
        onDelete={onDelete}
        onCancel={onCancel}
        isProcessing={isProcessing}
      />
    </div>
  );
}
