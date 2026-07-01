'use client';

import { useRouter } from 'next/navigation';

import { FaTrash } from 'react-icons/fa';

import { engineConfigToUrlParams } from '@/lib/engines';
import type { Game } from '@/lib/games/saved-game-types';

import { GameListItemBase } from '@/app/[locale]/_components/GameListItemBase';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  game: Game;
  locale: Locale;
  onDelete: (gameId: string) => void;
};

export function GameListItem({ game, locale, onDelete }: Props) {
  const router = useRouter();

  const handleGameClick = () => {
    // Build URL parameters for resuming the game. The engine + difficulty
    // travel via `engineConfigToUrlParams`, so a Maia game resumes against
    // Maia and a Stockfish game against Stockfish — without that, the play
    // route would default to Stockfish for any resumed Maia session.
    const params = new URLSearchParams({
      color: game.playerColor,
      ...engineConfigToUrlParams(game.engineConfig),
      moves: JSON.stringify(game.moves),
      gameId: game.id, // Include game ID for proper resumption
    });

    // A finished game opens the read-only finished-game view (the familiar
    // game UI for reviewing moves / logs) rather than bouncing to the result
    // screen; `finished=1` tells PlayClient to render the play panel in
    // `finished` mode (mutating controls disabled + overlaid, board / move list
    // still navigable) and skip the redirect. In-progress games resume to play
    // as before.
    if (game.status !== 'in_progress') {
      params.set('finished', '1');
    }

    // Navigate to the game play screen with existing game state
    router.push(`/${locale}/games/play?${params.toString()}`);
  };

  return (
    <li
      className="hover:bg-muted transition-all duration-200 cursor-pointer group border-b border-border last:border-b-0"
      onClick={handleGameClick}
    >
      <GameListItemBase
        game={game}
        after={
          <div className="flex-shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(game.id);
              }}
              className="p-2 text-muted-foreground hover:text-destructive transition-colors"
              title="Delete game"
            >
              <FaTrash className="w-4 h-4" />
            </button>
          </div>
        }
      />
    </li>
  );
}
