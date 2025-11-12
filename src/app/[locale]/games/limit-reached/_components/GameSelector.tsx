'use client';

import { useState } from 'react';

import type { Game } from '@/lib/types';

import { GameList } from '@/app/[locale]/games/_components';

import { ReplaceActions } from './ReplaceActions';

type Props = {
  games: Game[];
  onDeleteAndSave: (gameIdsToDelete: string[]) => Promise<void>;
  onSkipSave: () => void;
  isProcessing: boolean;
};

export function GameSelector({ games, onDeleteAndSave, onSkipSave, isProcessing }: Props) {
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

      <ReplaceActions
        selectedGameIds={selectedGameIds}
        onDeleteAndSave={onDeleteAndSave}
        onSkipSave={onSkipSave}
        isProcessing={isProcessing}
      />
    </div>
  );
}
