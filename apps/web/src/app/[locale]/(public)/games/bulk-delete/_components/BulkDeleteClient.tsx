'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { LocalStorageGameRepository } from '@/lib/repositories';
import type { Game } from '@/lib/types';

import { GameSelector } from '@/app/[locale]/(public)/games/_components';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import { BulkDeleteActions } from './BulkDeleteActions';
import { GameSelectorSkeleton } from './GameSelectorSkeleton';

export function BulkDeleteClient() {
  const t = useTranslations('bulkDelete');
  const { showToast } = useToast();

  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const loadGames = async () => {
      const gameRepository = new LocalStorageGameRepository();
      const existingGames = await gameRepository.loadAllSorted('lastPlayed', 'desc');
      setGames(existingGames);
      setIsLoading(false);
    };

    loadGames();
  }, []);

  const handleDelete = async (gameIdsToDelete: string[]) => {
    setIsProcessing(true);

    try {
      const gameRepository = new LocalStorageGameRepository();

      for (const gameId of gameIdsToDelete) {
        await gameRepository.delete(gameId);
      }

      setGames((prev) => prev.filter((game) => !gameIdsToDelete.includes(game.id)));
      showToast(t('deletedToast', { count: gameIdsToDelete.length }), 'success');
    } catch (error) {
      console.error('Failed to delete games:', error);
      showToast(t('deleteFailedToast'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <GameSelectorSkeleton />;
  }

  if (games.length === 0) {
    return (
      <div className="bg-muted/30 rounded-lg p-6 text-center">
        <p className="text-foreground">{t('noGames')}</p>
      </div>
    );
  }

  return (
    <GameSelector
      games={games}
      isProcessing={isProcessing}
      renderActions={(selectedGameIds) => (
        <BulkDeleteActions
          selectedGameIds={selectedGameIds}
          onDelete={handleDelete}
          isProcessing={isProcessing}
        />
      )}
    />
  );
}
