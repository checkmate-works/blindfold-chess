'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';

import { MAX_GAMES } from '@/config';

import { LocalStorageGameRepository } from '@/lib/repositories';
import type { Game, GameStatus } from '@/lib/types';
import type { AlgebraicNotation, Side, SkillLevel } from '@/lib/types';

import { PageTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GameSelector } from './_components/GameSelector';

type PendingGame = {
  moves: AlgebraicNotation[];
  playerColor: Side;
  skillLevel: SkillLevel;
  status: GameStatus;
};

export default function ManageLimitPage() {
  const params = useParams();
  const locale = params.locale as Locale;
  const router = useRouter();
  const t = useTranslations('home.manageLimit');

  const [games, setGames] = useState<Game[]>([]);
  const [pendingGame, setPendingGame] = useState<PendingGame | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      // Load pending game from sessionStorage
      const pendingGameData = sessionStorage.getItem('blindfold_chess_pending_game');
      if (pendingGameData) {
        try {
          const parsed = JSON.parse(pendingGameData) as PendingGame;
          setPendingGame(parsed);
        } catch (error) {
          console.error('Failed to parse pending game data:', error);
          router.push(`/${locale}`);
          return;
        }
      } else {
        // No pending game, redirect to home
        router.push(`/${locale}`);
        return;
      }

      // Load existing games
      const gameRepository = new LocalStorageGameRepository();
      const existingGames = await gameRepository.loadAllSorted('lastPlayed', 'desc');
      setGames(existingGames);
      setIsLoading(false);
    };

    loadData();
  }, [locale, router]);

  const handleDeleteAndSave = async (gameIdsToDelete: string[]) => {
    if (!pendingGame) return;

    setIsProcessing(true);
    try {
      const gameRepository = new LocalStorageGameRepository();

      // Delete selected games
      for (const gameId of gameIdsToDelete) {
        await gameRepository.delete(gameId);
      }

      // Save pending game
      await gameRepository.create({
        moves: pendingGame.moves,
        playerColor: pendingGame.playerColor,
        skillLevel: pendingGame.skillLevel,
        status: pendingGame.status,
      });

      // Clear pending game from sessionStorage
      sessionStorage.removeItem('blindfold_chess_pending_game');
      sessionStorage.removeItem('blindfold_chess_game_limit_reached');

      // Show success toast
      sessionStorage.setItem('blindfold_chess_show_save_toast', 'true');

      // Redirect to home
      router.push(`/${locale}`);
    } catch (error) {
      console.error('Failed to delete games and save:', error);
      alert(t('errorSaving'));
      setIsProcessing(false);
    }
  };

  const handleSkipSave = () => {
    // Clear pending game from sessionStorage
    sessionStorage.removeItem('blindfold_chess_pending_game');
    sessionStorage.removeItem('blindfold_chess_game_limit_reached');

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

  if (!pendingGame) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <PageTitle>{t('title')}</PageTitle>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-sm text-foreground">{t('explanation', { limit: MAX_GAMES })}</p>
        </div>
      </div>

      <GameSelector
        games={games}
        onDeleteAndSave={handleDeleteAndSave}
        onSkipSave={handleSkipSave}
        isProcessing={isProcessing}
      />
    </div>
  );
}
