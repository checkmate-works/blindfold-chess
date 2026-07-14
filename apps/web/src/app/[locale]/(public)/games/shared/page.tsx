/**
 * Shared Games gallery (公開対局の一覧)
 *
 * @description
 * Public catalog of community-shared blindfold games, newest first. Each card
 * uses the shared {@link CatalogListCard} — the same thumbnail-led card the
 * puzzle / position-memory lists use — with the game's opening position as the
 * board thumbnail. Clicking a card opens the detail at that same opening board.
 * Only `public`, non-deleted games are listed.
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getStartingFen } from '@blindfold-chess/features/chess-core';

import { getOptionalUser } from '@/lib/auth';
import { countSharedGames, listSharedGames } from '@/lib/db/games-read';
import { GAME_LIKE_TARGET, getLikeMetaMap } from '@/lib/db/like-queries';
import { EMPTY_REPLY_META, getGameCommentMetaMap } from '@/lib/db/reply-meta-queries';
import { getPaginationParams } from '@/lib/pagination';

import { getOpeningDisplayName } from '@/app/[locale]/(public)/topics/openings/_lib/get-opening-display-name';
import { PageLayout } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { CatalogListCard } from '@/app/[locale]/_components/CatalogListCard';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GamesTabs } from '../_components/GamesTabs';
import { toggleGameLikeAction } from './[id]/_actions/game-like';
import { GameColorOpeningRow } from './_components/GameColorOpeningRow';
import { PublishExistingGameButton } from './_components/PublishExistingGameButton';
import { SharedGamesSort } from './_components/SharedGamesSort';
import { parseSharedGamesSort } from './_lib/sort';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'sharedGames' });
  const title = t('list.title');

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/shared', title }),
    title: resolveTitle(title, locale),
  };
}

export default async function SharedGamesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'sharedGames' });

  const sp = await searchParams;
  const sort = parseSharedGamesSort(sp.sort);
  const page = Number(sp.page) || 1;

  const totalCount = await countSharedGames();
  const { currentPage, totalPages, limit, offset } = getPaginationParams(page, totalCount);
  const items = await listSharedGames(sort, limit, offset);

  const currentUser = await getOptionalUser();
  const ids = items.map((g) => g.id);
  const [likeMetaMap, commentMetaMap] = await Promise.all([
    getLikeMetaMap(GAME_LIKE_TARGET, ids, currentUser?.id),
    getGameCommentMetaMap(ids),
  ]);
  const justNowLabel = t('detail.justNow');
  const [openingNameT, tPlay] = await Promise.all([
    getTranslations({ locale, namespace: 'topics.openings.names' }),
    getTranslations({ locale, namespace: 'play' }),
  ]);

  return (
    <PageLayout title={t('list.title')} locale={locale}>
      <div className="mb-6">
        <GamesTabs active="shared" locale={locale} />
      </div>
      <PublishExistingGameButton locale={locale} />
      <div className="mt-3 mb-4 flex justify-end">
        <SharedGamesSort currentSort={sort} />
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{t('list.empty')}</p>
      ) : (
        <div className="space-y-3">
          {items.map((g) => (
            <CatalogListCard
              key={g.id}
              id={g.id}
              fen={g.startingFen ?? getStartingFen()}
              title={g.title}
              description={g.description}
              createdAt={g.createdAt}
              profile={g.author}
              likeMeta={likeMetaMap.get(g.id) ?? { likeCount: 0, likedByMe: false }}
              replyMeta={commentMetaMap.get(g.id) ?? EMPTY_REPLY_META}
              detailHref={`/games/shared/${g.id}`}
              i18nNamespace="sharedGames.detail"
              toggleLikeAction={toggleGameLikeAction}
              justNowLabel={justNowLabel}
              locale={locale}
              topicKey=""
              meta={
                <GameColorOpeningRow
                  playerColor={g.playerColor}
                  colorLabel={
                    g.playerColor === 'white'
                      ? tPlay('playerColor.white')
                      : tPlay('playerColor.black')
                  }
                  opening={g.opening}
                  openingDisplayName={
                    g.opening
                      ? getOpeningDisplayName(openingNameT, g.opening.slug, g.opening.name)
                      : undefined
                  }
                  locale={locale}
                />
              }
            />
          ))}
        </div>
      )}

      <PaginationNav
        currentPage={currentPage}
        totalPages={totalPages}
        buildHref={(p) => {
          const query = new URLSearchParams();
          if (sort !== 'new') query.set('sort', sort);
          query.set('page', String(p));
          return `/${locale}/games/shared?${query.toString()}`;
        }}
      />

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
