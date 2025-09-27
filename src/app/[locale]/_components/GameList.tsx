import { Game } from '../play/_lib/game-repository';
import { GameListItem } from './GameListItem';
import type { Locale } from '../_lib/types';

interface GameListProps {
  games: Game[];
  locale: Locale;
  onDeleteGame: (gameId: string) => void;
  sortControls?: React.ReactNode;
  translations: {
    title: string;
    noGames: string;
    count: string;
    moves: string;
    level: string;
    win: string;
    loss: string;
    draw: string;
    inProgress: string;
  };
}

export function GameList({
  games,
  locale,
  onDeleteGame,
  sortControls,
  translations,
}: GameListProps) {
  if (games.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 sm:p-12">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <span className="text-2xl">♔</span>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">{translations.noGames}</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{translations.title}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {games.length} {translations.count}
          </p>
        </div>
        {sortControls && <div>{sortControls}</div>}
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <ul>
          {games.map((game) => (
            <GameListItem
              key={game.id}
              game={game}
              locale={locale}
              onDelete={onDeleteGame}
              translations={{
                moves: translations.moves,
                level: translations.level,
                win: translations.win,
                loss: translations.loss,
                draw: translations.draw,
                inProgress: translations.inProgress,
              }}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
