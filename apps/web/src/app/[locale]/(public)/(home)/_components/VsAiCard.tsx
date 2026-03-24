'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';
import { ChessPieceIcon } from '@blindfold-chess/icons';
import { FaPlay, FaPlus } from 'react-icons/fa';

import type { Game } from '@/lib/types';

import { ColorIcon } from '@/app/[locale]/_components/ColorIcon';

import { useGameList } from '../_hooks/use-game-list';

type Props = {
  locale: string;
};

function ResumeGameInfo({
  game,
  movesLabel,
  levelLabel,
}: {
  game: Game;
  movesLabel: string;
  levelLabel: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
      <ColorIcon color={game.playerColor} />
      <span className="font-medium">
        {levelLabel} {game.skillLevel}
      </span>
      <span aria-hidden="true">&middot;</span>
      <span>
        {game.moves.length} {movesLabel}
      </span>
    </div>
  );
}

export function VsAiCard({ locale }: Props) {
  const t = useTranslations('home.vsAi');
  const { games, isLoading } = useGameList('lastPlayed', 'desc');

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 animate-pulse">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-muted" />
              <div className="h-5 w-16 rounded bg-muted" />
            </div>
            <div className="h-9 w-32 rounded-md bg-muted" />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="h-3 w-10 rounded bg-muted" />
            <div className="flex-1 h-px bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  const inProgressGames = games.filter((g) => g.status === 'in_progress');
  const latestGame = inProgressGames[0] ?? null;

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <ChessPieceIcon type="p" color="w" size={20} />
            <h2 className="text-base font-semibold text-foreground">{t('title')}</h2>
          </div>

          <div className="flex items-center gap-2">
            {!latestGame && (
              <Link
                href="/games/new/standard"
                locale={locale}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <FaPlus className="w-3 h-3" />
                {t('startGame')}
              </Link>
            )}
            <Link
              href="/games"
              locale={locale}
              className="text-sm text-link-primary hover:text-link-primary/80 transition-colors"
            >
              {t('allGames')}
            </Link>
          </div>
        </div>

        {latestGame && (
          <>
            <div className="flex items-center gap-2 my-2">
              <span className="text-xs text-muted-foreground">{t('recent')}</span>
              <div className="flex-1 border-t border-border" />
            </div>

            <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
              <ResumeGameInfo game={latestGame} movesLabel={t('moves')} levelLabel={t('level')} />

              <div className="flex items-center gap-2 ml-auto">
                <Link
                  href="/games/play"
                  locale={locale}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <FaPlay className="w-3 h-3" />
                  {t('resume')}
                </Link>
                <Link
                  href="/games/new/standard"
                  locale={locale}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <FaPlus className="w-3 h-3" />
                  {t('newGame')}
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
