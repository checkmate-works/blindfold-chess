'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { Game } from '@/lib/games/saved-game-types';

import { GameListSkeleton } from '@/app/[locale]/(public)/(home)/_components/GameListSkeleton';
import { useGameList } from '@/app/[locale]/(public)/(home)/_hooks/use-game-list';
import { GameListItemBase } from '@/app/[locale]/_components/GameListItemBase';

type Props = {
  onSelect: (game: Game) => void;
};

/**
 * Lets the user pick one of their own locally-saved games (the same
 * `blindfold_chess_games` localStorage list shown on `/games`) to recall
 * instead of pasting a PGN. Only finished games are listable — an
 * in-progress game has no complete move sequence to review. Picking a row
 * reports the game up to `RecallSetupForm`, which formats it into PGN text
 * and switches to the "Paste PGN" tab — same "import → land on manual tab
 * for review → Start Recall" flow as the Lichess import.
 */
export function MyGamesImportPanel({ onSelect }: Props) {
  const t = useTranslations('recall');
  const { games, isLoading } = useGameList('lastPlayed', 'desc');

  const finishedGames = games.filter((game) => game.status !== 'in_progress');

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
            onClick={() => onSelect(game)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(game);
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
