'use client';

import { useRouter } from 'next/navigation';

import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { Game } from '@/lib/games/saved-game-types';

import { GameListSkeleton } from '@/app/[locale]/(public)/(home)/_components/GameListSkeleton';
import { useGameList } from '@/app/[locale]/(public)/(home)/_hooks/use-game-list';
import { GameListItemBase } from '@/app/[locale]/_components/GameListItemBase';

/**
 * Lets the user pick one of their own locally-saved games (the same
 * `blindfold_chess_games` localStorage list shown on `/games`) to recall
 * instead of pasting a PGN. Only finished games are listable — an
 * in-progress game has no complete move sequence to review. Picking a row
 * jumps straight to the recall session (mirrors the "Recall" card on the
 * game-finish modal): there's no PGN text to review here, since the moves
 * are already a validated, played sequence rather than pasted input.
 */
export function MyGamesImportPanel() {
  const t = useTranslations('recall');
  const router = useRouter();
  const locale = useLocale();
  const { games, isLoading } = useGameList('lastPlayed', 'desc');

  const finishedGames = games.filter((game) => game.status !== 'in_progress');

  const handleSelect = (game: Game) => {
    const params = new URLSearchParams({ color: game.playerColor });
    params.set('moves', JSON.stringify(game.moves));
    if (game.startingFen) params.set('fen', game.startingFen);
    params.set('gameId', game.id);
    router.push(`/${locale}/practice/recall/session?${params.toString()}`);
  };

  if (isLoading) {
    return <GameListSkeleton rows={3} />;
  }

  if (finishedGames.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {t('setup.myGamesImport.empty')}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <ul>
        {finishedGames.map((game) => (
          <li
            key={game.id}
            role="button"
            tabIndex={0}
            onClick={() => handleSelect(game)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelect(game);
              }
            }}
            className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted transition-colors"
          >
            <GameListItemBase game={game} />
          </li>
        ))}
      </ul>
    </div>
  );
}
