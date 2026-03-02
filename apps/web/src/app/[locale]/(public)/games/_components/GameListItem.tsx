'use client';

import { FaCheck } from 'react-icons/fa';

import { GameListItemBase } from '@/app/[locale]/_components/GameListItemBase';

import type { GameItemDisplayProps } from './types';

export function GameListItem({ game, isSelected, isDisabled, onToggle }: GameItemDisplayProps) {
  return (
    <li
      className={`transition-all duration-200 cursor-pointer ${
        isSelected ? 'bg-muted' : 'hover:bg-muted/50'
      } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={() => !isDisabled && onToggle(game.id)}
    >
      <GameListItemBase
        game={game}
        statusIconClassName="flex-shrink-0"
        before={
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
              isSelected ? 'bg-foreground border-foreground' : 'border-muted-foreground'
            }`}
          >
            {isSelected && <FaCheck className="w-3 h-3 text-background" />}
          </div>
        }
      />
    </li>
  );
}
