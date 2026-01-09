'use client';

import { useTranslations } from 'next-intl';

import { FaCheck } from 'react-icons/fa';

import { formatLastMove } from '@/app/[locale]/(home)/_lib/utils';
import { ColorIcon } from '@/app/[locale]/_components/ColorIcon';

import type { GameItemDisplayProps } from './types';
import { getStatusIcon, getStatusStyles } from './types';

export function GameListItem({ game, isSelected, isDisabled, onToggle }: GameItemDisplayProps) {
  const tGameList = useTranslations('home.gameList');

  const getStatusText = (status: typeof game.status) => {
    switch (status) {
      case 'win':
        return tGameList('win');
      case 'loss':
        return tGameList('loss');
      case 'draw':
        return tGameList('draw');
      default:
        return tGameList('inProgress');
    }
  };

  return (
    <li
      className={`transition-all duration-200 cursor-pointer ${
        isSelected ? 'bg-muted' : 'hover:bg-muted/50'
      } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={() => !isDisabled && onToggle(game.id)}
    >
      <div className="px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Checkbox */}
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                isSelected ? 'bg-foreground border-foreground' : 'border-muted-foreground'
              }`}
            >
              {isSelected && <FaCheck className="w-3 h-3 text-background" />}
            </div>

            {/* Status Icon */}
            <span
              className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-base flex-shrink-0 ${getStatusStyles(
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

              <span className="font-medium font-mono">
                {formatLastMove(game.moves, game.playerColor)}
              </span>

              <span className="font-medium">
                {tGameList('level')} {game.skillLevel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
