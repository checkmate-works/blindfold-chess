import { useTranslations } from 'next-intl';

import { FaCheck } from 'react-icons/fa';

import { GameListItem } from './GameListItem';
import type { GameListProps } from './types';

export function GameList({
  games,
  selectedGameIds,
  onToggleGame,
  isDisabled = false,
  onToggleAll,
  isAllSelected = false,
}: GameListProps) {
  const t = useTranslations('bulkDelete');

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
      {onToggleAll && games.length > 0 && (
        <div
          className={`px-4 sm:px-6 py-3 border-b border-border bg-muted/30 flex items-center gap-3 cursor-pointer ${
            isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50'
          }`}
          onClick={!isDisabled ? onToggleAll : undefined}
        >
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
              isAllSelected ? 'bg-foreground border-foreground' : 'border-muted-foreground'
            }`}
          >
            {isAllSelected && <FaCheck className="w-3 h-3 text-background" />}
          </div>
          <span className="font-medium text-sm select-none">{t('selectAll')}</span>
        </div>
      )}
      <ul className="divide-y divide-border">
        {games.map((game) => {
          const isSelected = selectedGameIds.has(game.id);
          return (
            <GameListItem
              key={game.id}
              game={game}
              isSelected={isSelected}
              isDisabled={isDisabled}
              onToggle={onToggleGame}
            />
          );
        })}
      </ul>
    </div>
  );
}
