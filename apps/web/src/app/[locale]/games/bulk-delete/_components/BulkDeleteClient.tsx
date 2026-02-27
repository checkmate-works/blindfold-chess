'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { LocalStorageGameRepository } from '@/lib/repositories';
import type { Game } from '@/lib/types';

import { Divider, PageDescription, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import type { Locale } from '@/app/[locale]/_lib/types';
import { GameSelector } from '@/app/[locale]/games/_components';

import { BulkDeleteActions } from './BulkDeleteActions';
import { GameSelectorSkeleton } from './GameSelectorSkeleton';

type Props = {
  locale: Locale;
};

export function BulkDeleteClient({ locale }: Props) {
  const router = useRouter();
  const t = useTranslations('home.bulkDelete');

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

      // Delete selected games
      for (const gameId of gameIdsToDelete) {
        await gameRepository.delete(gameId);
      }

      // Store deleted count for toast
      sessionStorage.setItem('blindfold_chess_deleted_count', gameIdsToDelete.length.toString());
      sessionStorage.setItem('blindfold_chess_show_delete_toast', 'true');

      // Redirect to home
      router.push(`/${locale}`);
    } catch (error) {
      console.error('Failed to delete games:', error);
      alert(t('errorDeleting'));
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageTitle>{t('title')}</PageTitle>
        <GameSelectorSkeleton />
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="space-y-8">
        <PageTitle>{t('title')}</PageTitle>
        <div className="bg-muted/30 rounded-lg p-6 text-center">
          <p className="text-foreground">{t('noGames')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <PageTitle>{t('title')}</PageTitle>
        <PageDescription>{t('explanation')}</PageDescription>
      </div>

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

      <Divider />

      <Breadcrumb
        items={[
          { label: t('title'), href: undefined }, // "Organize Games"
        ]}
        locale={locale}
      />
    </div>
  );
}
