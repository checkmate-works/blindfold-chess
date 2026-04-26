'use client';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { ChessPieceIcon } from '@blindfold-chess/icons';
import { FaPlay, FaPlus } from 'react-icons/fa';

import type { Game } from '@/lib/types';

import { DashboardSection, DashboardSectionHeader } from '@/app/[locale]/_components';
import { ColorIcon } from '@/app/[locale]/_components/ColorIcon';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';

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
      <DashboardSection>
        <div className="animate-pulse">
          {/* Top row: icon + title on left, link placeholder on right */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-muted" />
              <div className="h-5 w-16 rounded bg-muted" />
            </div>
            <div className="h-4 w-20 rounded bg-muted" />
          </div>
          {/* Recent divider */}
          <div className="flex items-center gap-2 my-2">
            <div className="h-3 w-8 rounded bg-muted" />
            <div className="flex-1 h-px bg-muted" />
          </div>
          {/* Game info row: color + level + moves on left, buttons on right */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-muted" />
              <div className="h-4 w-12 rounded bg-muted" />
              <div className="h-4 w-14 rounded bg-muted" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-16 rounded-md bg-muted" />
              <div className="h-8 w-24 rounded-md bg-muted" />
            </div>
          </div>
        </div>
      </DashboardSection>
    );
  }

  const inProgressGames = games.filter((g) => g.status === 'in_progress');
  const latestGame = inProgressGames[0] ?? null;

  return (
    <DashboardSection>
      <DashboardSectionHeader
        icon={<ChessPieceIcon type="p" color="w" size={20} />}
        title={t('title')}
        actions={
          <>
            {!latestGame && (
              <Link
                href="/games/new"
                locale={locale}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <FaPlus className="w-3 h-3" />
                {t('startGame')}
              </Link>
            )}
            <Link href="/games" locale={locale} className={`text-sm ${TEXT_LINK_CLASSES}`}>
              {t('allGames')}
            </Link>
          </>
        }
      />

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
                href={`/games/play?gameId=${latestGame.id}`}
                locale={locale}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <FaPlay className="w-3 h-3" />
                {t('resume')}
              </Link>
              <Link
                href="/games/new"
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
    </DashboardSection>
  );
}
