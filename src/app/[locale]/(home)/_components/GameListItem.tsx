'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FaTrash } from 'react-icons/fa';
import { ColorIcon } from '../../_components/ColorIcon';
import type { Game } from '@/lib/types';
import type { Locale } from '../../_lib/types';

type Props = {
  game: Game;
  locale: Locale;
  onDelete: (gameId: string) => void;
};

export function GameListItem({ game, locale, onDelete }: Props) {
  const router = useRouter();
  const t = useTranslations('home.gameList');

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

  const getStatusStyles = (status: Game['status']) => {
    switch (status) {
      case 'win':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'loss':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'draw':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const getStatusIcon = (status: Game['status']) => {
    switch (status) {
      case 'win':
        return '✓';
      case 'loss':
        return '✗';
      case 'draw':
        return '=';
      default:
        return '⏸';
    }
  };

  const getStatusText = (status: Game['status']) => {
    switch (status) {
      case 'win':
        return t('win');
      case 'loss':
        return t('loss');
      case 'draw':
        return t('draw');
      default:
        return t('inProgress');
    }
  };

  return (
    <li
      className="hover:bg-muted transition-all duration-200 cursor-pointer group border-b border-border last:border-b-0"
      onClick={handleGameClick}
    >
      <div className="px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Status Icon */}
            <span
              className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-base ${getStatusStyles(
                game.status
              )}`}
              title={getStatusText(game.status)}
            >
              {getStatusIcon(game.status)}
            </span>

            {/* Game Info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center" title={game.playerColor}>
                <ColorIcon color={game.playerColor} />
              </div>

              <span className="text-muted-foreground">•</span>

              <span className="font-medium">
                {game.moves.length} {t('moves')}
              </span>

              <span className="text-muted-foreground">•</span>

              <span className="font-medium">
                {t('level')} {game.skillLevel}
              </span>
            </div>
          </div>

          {/* Delete button */}
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
        </div>
      </div>
    </li>
  );
}
