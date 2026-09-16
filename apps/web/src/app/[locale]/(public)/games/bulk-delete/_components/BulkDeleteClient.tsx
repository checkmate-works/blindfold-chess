'use client';

import { useEffect, useState } from 'react';

import { useRouter } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { LocalStorageGameRepository } from '@/lib/games/local-storage-repository';
import type { Game } from '@/lib/games/saved-game-types';

import { GameSelector } from '@/app/[locale]/(public)/games/_components';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import { BulkDeleteActions } from './BulkDeleteActions';
import { GameSelectorSkeleton } from './GameSelectorSkeleton';

export function BulkDeleteClient() {
  const t = useTranslations('bulkDelete');
  const { showToast } = useToast();
  const router = useRouter();

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
        const deleted = await gameRepository.delete(gameId);
        // Stop at the first refusal rather than trying the rest: they all go
        // to the storage that just said no. The games deleted before it are
        // genuinely gone, so this leaves a partially shortened history; the
        // alternative is pressing on and reporting a deleted count that
        // includes games still sitting in storage.
        if (!deleted.ok) {
          showToast(t('deleteFailedToast'), 'error');
          return;
        }
      }

      showToast(t('deletedToast', { count: gameIdsToDelete.length }), 'success');
      router.push('/games');
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
