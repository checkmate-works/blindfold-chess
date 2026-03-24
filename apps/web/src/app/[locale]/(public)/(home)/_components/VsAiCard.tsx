'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';
import { FaChessKnight, FaPlay, FaPlus } from 'react-icons/fa';

import { getEloRating } from '@/lib/chess/elo';
import type { Game } from '@/lib/types';

import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';
import { ColorIcon } from '@/app/[locale]/_components/ColorIcon';

import { useGameList } from '../_hooks/use-game-list';

type Props = {
  locale: string;
};

function ResumeGameInfo({
  game,
  locale,
  justNowLabel,
  movesLabel,
  levelLabel,
}: {
  game: Game;
  locale: string;
  justNowLabel: string;
  movesLabel: string;
  levelLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
      <ColorIcon color={game.playerColor} />
      <span className="font-medium">
        {levelLabel} {game.skillLevel} ({getEloRating(game.skillLevel)} ELO)
      </span>
      <span>
        {game.moves.length} {movesLabel}
      </span>
      {game.lastPlayed && (
        <span>{formatRelativeTime(new Date(game.lastPlayed), locale, justNowLabel)}</span>
      )}
    </div>
  );
}

export function VsAiCard({ locale }: Props) {
  const t = useTranslations('home.vsAi');
  const { games, isLoading } = useGameList('lastPlayed', 'desc');

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 space-y-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-muted" />
            <div className="h-5 w-20 rounded bg-muted" />
          </div>
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-9 w-32 rounded-md bg-muted" />
        </div>
      </div>
    );
  }

  const inProgressGames = games.filter((g) => g.status === 'in_progress');
  const latestGame = inProgressGames[0] ?? null;

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
            <FaChessKnight className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-base font-semibold text-foreground">{t('title')}</h2>
        </div>

        {latestGame ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('resumeDescription')}</p>
            <ResumeGameInfo
              game={latestGame}
              locale={locale}
              justNowLabel={t('justNow')}
              movesLabel={t('moves')}
              levelLabel={t('level')}
            />
            <div className="flex items-center gap-3">
              <Link
                href="/games/play"
                locale={locale}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <FaPlay className="w-3 h-3" />
                {t('resume')}
              </Link>
              <Link
                href="/games/new/standard"
                locale={locale}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <FaPlus className="w-3 h-3" />
                {t('newGame')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('startDescription')}</p>
            <Link
              href="/games/new/standard"
              locale={locale}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <FaPlus className="w-3 h-3" />
              {t('startGame')}
            </Link>
          </div>
        )}

        <div className="mt-3 text-right">
          <Link
            href="/games"
            locale={locale}
            className="text-sm text-link-primary hover:text-link-primary/80 transition-colors"
          >
            {t('allGames')}
          </Link>
        </div>
      </div>
    </div>
  );
}
