'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useParams, usePathname, useRouter } from 'next/navigation';

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
  const pathname = usePathname();
  const t = useTranslations('home.manageLimit');

  const [games, setGames] = useState<Game[]>([]);
  const [pendingGame, setPendingGame] = useState<PendingGame | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasUserDecided, setHasUserDecided] = useState(false);
  const hasUserDecidedRef = useRef(false);

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

  // Sync ref with state
  useEffect(() => {
    hasUserDecidedRef.current = hasUserDecided;
  }, [hasUserDecided]);

  // Handle beforeunload event to warn user when leaving the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only show warning if user hasn't made a decision yet
      if (!hasUserDecidedRef.current) {
        e.preventDefault();
        // Modern browsers ignore custom messages and show their own
        // But we still need to set returnValue for compatibility
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // If user is leaving without making a decision, clear pending game data
      // This prevents the game from being saved when user explicitly navigates away
      if (!hasUserDecidedRef.current && pendingGame) {
        sessionStorage.removeItem('blindfold_chess_pending_game');
        sessionStorage.removeItem('blindfold_chess_game_limit_reached');
      }
    };
  }, [pendingGame]);

  // Intercept Next.js client-side navigation by intercepting link clicks
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Check if user has already decided
      if (hasUserDecidedRef.current) {
        return;
      }

      // Find if the click target is within a link
      let target = e.target as HTMLElement | null;
      let anchor: HTMLAnchorElement | null = null;

      // Traverse up to find an anchor element
      while (target && target !== document.body) {
        if (target.tagName === 'A') {
          anchor = target as HTMLAnchorElement;
          break;
        }
        target = target.parentElement;
      }

      // If no anchor found or it's an external link, allow it
      if (!anchor || !anchor.href) {
        return;
      }

      // Check if it's a same-origin navigation
      try {
        const targetUrl = new URL(anchor.href);
        const currentUrl = new URL(window.location.href);

        // If it's external or same page, allow it
        if (targetUrl.origin !== currentUrl.origin || targetUrl.pathname === pathname) {
          return;
        }

        // It's an internal navigation - show confirmation
        e.preventDefault();
        e.stopPropagation();

        const confirmed = window.confirm(
          'このページを離れますか？変更が保存されない可能性があります。'
        );

        if (confirmed) {
          // User confirmed - mark as decided and clear pending game data
          hasUserDecidedRef.current = true;
          setHasUserDecided(true);
          sessionStorage.removeItem('blindfold_chess_pending_game');
          sessionStorage.removeItem('blindfold_chess_game_limit_reached');

          // Use Next.js router for client-side navigation
          router.push(targetUrl.pathname);
        }
        // If not confirmed, do nothing (navigation is already prevented)
      } catch (error) {
        // Invalid URL, allow default behavior
        return;
      }
    };

    // Capture phase to intercept before Next.js Link handlers
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [pathname]);

  const handleDeleteAndSave = async (gameIdsToDelete: string[]) => {
    if (!pendingGame) return;

    setIsProcessing(true);
    setHasUserDecided(true); // Mark that user has made a decision

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
      setHasUserDecided(false); // Reset if error occurred
    }
  };

  const handleSkipSave = () => {
    setHasUserDecided(true); // Mark that user has made a decision

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
