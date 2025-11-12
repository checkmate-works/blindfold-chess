'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';

import { LocalStorageGameRepository } from '@/lib/repositories';
import type { Game } from '@/lib/types';

import { PageTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GameSelector } from './_components/GameSelector';

export default function BulkDeletePage() {
  const params = useParams();
  const locale = params.locale as Locale;
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

  const handleCancel = () => {
    // Redirect to home
    router.push(`/${locale}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageTitle>{t('title')}</PageTitle>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin text-4xl">⏳</div>
        </div>
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
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-foreground">{t('explanation')}</p>
        </div>
      </div>

      <GameSelector
        games={games}
        onDelete={handleDelete}
        onCancel={handleCancel}
        isProcessing={isProcessing}
      />
    </div>
  );
}
