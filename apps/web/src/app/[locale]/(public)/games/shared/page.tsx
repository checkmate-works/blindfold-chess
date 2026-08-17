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

import { Link } from '@/i18n/routing';
import { getStartingFen } from '@blindfold-chess/features/chess-core';

import { getReviewedGameIdSet } from '@/lib/ai-review/queries';
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
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GamesTabs } from '../_components/GamesTabs';
import { MIN_GAMES_FOR_MID_AD } from '../_lib/mid-ad';
import { toggleGameLikeAction } from './[id]/_actions/game-like';
import { AiReviewedBadge } from './_components/AiReviewedBadge';
import { GameColorOpeningRow } from './_components/GameColorOpeningRow';
import { PublishExistingGameButton } from './_components/PublishExistingGameButton';
import { SharedGamesSort } from './_components/SharedGamesSort';
import { getMyPublishedGames } from './_lib/my-published-games';
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
  const [t, openingNameT, tPlay, sp, totalCount, currentUser] = await Promise.all([
    getTranslations({ locale, namespace: 'sharedGames' }),
    getTranslations({ locale, namespace: 'topics.openings.names' }),
    getTranslations({ locale, namespace: 'play' }),
    searchParams,
    countSharedGames(),
    getOptionalUser(),
  ]);
  const sort = parseSharedGamesSort(sp.sort);
  const page = Number(sp.page) || 1;

  const { currentPage, totalPages, limit, offset } = getPaginationParams(page, totalCount);
  const items = await listSharedGames(sort, limit, offset);

  const ids = items.map((g) => g.id);
  const [likeMetaMap, commentMetaMap, reviewedIds, myPublished] = await Promise.all([
    getLikeMetaMap(GAME_LIKE_TARGET, ids, currentUser?.id),
    getGameCommentMetaMap(ids),
    getReviewedGameIdSet(ids),
    currentUser ? getMyPublishedGames(currentUser.id) : null,
  ]);
  const justNowLabel = t('detail.justNow');

  return (
    <PageLayout title={t('list.title')} locale={locale}>
      <div className="mb-6">
        <GamesTabs active="shared" locale={locale} />
      </div>
      <PublishExistingGameButton locale={locale} />

      {/*
       * Mid-page ad above the sort control, before the list. Only once the
       * catalog is long enough (>= MIN_GAMES_FOR_MID_AD): a short list keeps
       * content-bottom near the fold, so a second ad would only crowd it.
       * `totalCount` is already loaded, no query.
       */}
      {totalCount >= MIN_GAMES_FOR_MID_AD && <AdSlot slot="content-middle" />}

      {/*
       * "My published games" points at the viewer's own profile archive
       * (`/u/[username]/games`) rather than filtering this list in place: the
       * archive already renders the same cards scoped to one author, so an
       * owner filter here would be a second copy of it, with `sort` / `page` /
       * owner to keep combined across the sort control and the pagination
       * links. Absent for viewers with nothing to show — see
       * {@link getMyPublishedGames}.
       */}
      <div
        className={`mt-3 mb-4 flex flex-wrap items-center gap-2 ${myPublished ? 'justify-between' : 'justify-end'}`}
      >
        {myPublished && (
          <Link
            href={`/u/${myPublished.username}/games`}
            locale={locale}
            className={`text-sm ${TEXT_LINK_CLASSES}`}
          >
            {t('list.myPublished')} ({myPublished.count})
          </Link>
        )}
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
              thumbnailDisplaySettings={g.thumbnailDisplay}
              title={g.title}
              description={g.description}
              createdAt={g.createdAt}
              profile={g.author}
              likeMeta={likeMetaMap.get(g.id) ?? { likeCount: 0, likedByMe: false }}
              replyMeta={commentMetaMap.get(g.id) ?? EMPTY_REPLY_META}
              detailHref={`/games/shared/${g.id}`}
              // GameReview's own hash handler scrolls to #game-overview,
              // not the generic #comments id — see GameFeedCard's home-feed
              // equivalent.
              commentHref={`/games/shared/${g.id}#game-overview`}
              i18nNamespace="sharedGames.detail"
              toggleLikeAction={toggleGameLikeAction}
              justNowLabel={justNowLabel}
              locale={locale}
              topicKey=""
              badge={
                reviewedIds.has(g.id) ? (
                  <AiReviewedBadge label={t('list.aiReviewedBadge')} />
                ) : undefined
              }
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
        locale={locale}
      />

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
