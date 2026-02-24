'use client';

import { useRouter } from 'next/navigation';

import { FaTrash } from 'react-icons/fa';

import type { Game } from '@/lib/types';

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
    // Build URL parameters for resuming the game
    const params = new URLSearchParams({
      color: game.playerColor,
      skillLevel: game.skillLevel.toString(),
      moves: JSON.stringify(game.moves),
      gameId: game.id, // Include game ID for proper resumption
    });

    // Navigate to the game play screen with existing game state
    router.push(`/${locale}/play?${params.toString()}`);
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
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
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
