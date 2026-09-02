import type { ReactNode } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { Game } from '@/lib/games/saved-game-types';

import { formatLastMove, getStatusIcon, getStatusStyles } from '../_lib/game-display-utils';
import { ColorIcon } from './ColorIcon';
import { EngineConfigBadge } from './EngineConfigBadge';

type Props = {
  game: Game;
  before?: ReactNode;
  after?: ReactNode;
  statusIconClassName?: string;
};

export function GameListItemBase({ game, before, after, statusIconClassName = '' }: Props) {
  const t = useTranslations('home.gameList');

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
    <div className="px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {before}

          {/* Status Icon */}
          <span
            className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-base ${statusIconClassName} ${getStatusStyles(game.status)}`}
            title={getStatusText(game.status)}
          >
            {getStatusIcon(game.status)}
          </span>

          {/* Game Info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center" title={game.playerColor}>
              <ColorIcon color={game.playerColor} />
            </div>

            {/*
             * Engine badge before the move text: the color icon and this
             * badge are both fixed-position, so the engine logos line up
             * in a tidy column down the list. The variable-width move text
             * trails last, where a ragged right edge reads naturally.
             */}
            <EngineConfigBadge config={game.engineConfig} levelLabel={t('level')} />

            <span className="font-medium font-mono">
              {formatLastMove(game.moves, game.playerColor, game.startingFen)}
            </span>
          </div>
        </div>

        {after}
      </div>
    </div>
  );
}
