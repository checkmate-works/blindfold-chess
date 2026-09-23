/**
 * Shared Games gallery (公開対局の一覧)
 *
 * @description
 * Public catalog of community-shared blindfold games, newest first. Each card
 * uses the shared {@link SharedGameListCard} — the same thumbnail-led card the
 * profile games tab and a chunk's related games use — with the opening position as the
 * board thumbnail. Clicking a card opens the detail at that same opening board.
 * Only `public`, non-deleted games are listed.
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { resolveNativeAds } from '@/lib/ads/ad';
import { withRepeatingNativeAds } from '@/lib/ads/placement';
import { SHARED_GAME_LIST_NATIVE_AD_SLOT } from '@/lib/ads/registry';
import { getReviewedGameIdSet } from '@/lib/ai-review/queries';
import { getOptionalUser } from '@/lib/auth';
import { countSharedGames, listSharedGames } from '@/lib/db/games-read';
import { GAME_LIKE_TARGET, getLikeMetaMap } from '@/lib/db/like-queries';
import { EMPTY_REPLY_META, getGameCommentMetaMap } from '@/lib/db/reply-meta-queries';
import { getPaginationParams } from '@/lib/pagination';

import { getOpeningDisplayName } from '@/app/[locale]/(public)/topics/openings/_lib/get-opening-display-name';
import { PageLayout } from '@/app/[locale]/_components';
import { NativeAdCard } from '@/app/[locale]/_components/NativeAdCard';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GamesTabs } from '../_components/GamesTabs';
import { PublishExistingGameButton } from './_components/PublishExistingGameButton';
import { SharedGameListCard } from './_components/SharedGameListCard';
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
  const [t, openingNameT, tPlay, tCommon, sp, totalCount, currentUser] = await Promise.all([
    getTranslations({ locale, namespace: 'sharedGames' }),
    getTranslations({ locale, namespace: 'topics.openings.names' }),
    getTranslations({ locale, namespace: 'play' }),
    getTranslations({ locale, namespace: 'Common' }),
    searchParams,
    countSharedGames(),
    getOptionalUser(),
  ]);
  const sort = parseSharedGamesSort(sp.sort);
  const page = Number(sp.page) || 1;

  const { currentPage, totalPages, limit, offset } = getPaginationParams(page, totalCount);
  const items = await listSharedGames(sort, limit, offset, currentUser?.id);

  const ids = items.map((g) => g.id);
  // The ad pool is server-gated: an ad-free reader gets an empty pool and
  // therefore no cards at all. The `.ad-slot-wrapper` CSS hide that
  // `NativeAdCard` owns is the second layer, for the first paint.
  const [likeMetaMap, commentMetaMap, reviewedIds, myPublished, { creatives: nativeAdCreatives }] =
    await Promise.all([
      getLikeMetaMap(GAME_LIKE_TARGET, ids, currentUser?.id),
      getGameCommentMetaMap(ids),
      getReviewedGameIdSet(ids),
      currentUser ? getMyPublishedGames(currentUser.id) : null,
      resolveNativeAds(SHARED_GAME_LIST_NATIVE_AD_SLOT, currentUser?.id ?? null, locale),
    ]);
  const justNowLabel = t('detail.justNow');
  const authorLabels = {
    anonymous: tCommon('anonymousUser'),
    deleted: tCommon('deletedUser'),
  };

  return (
    <PageLayout title={t('list.title')} locale={locale}>
      <div className="mb-6">
        <GamesTabs active="shared" locale={locale} />
      </div>
      <PublishExistingGameButton locale={locale} />

      {/*
       * "My published games" points at the viewer's own profile archive
       * (`/u/[username]/games`) rather than filtering this list in place: the
       * archive already renders the same cards scoped to one author, so an
       * owner filter here would be a second copy of it, with `sort` / `page` /
       * owner to keep combined across the sort control and the pagination
       * links. Absent for viewers with nothing to show — see
       * {@link getMyPublishedGames}.
       */}
      {myPublished && (
        <div className="mt-3 flex justify-end">
          <Link
            href={`/u/${myPublished.username}/games`}
            locale={locale}
            className={`text-sm ${TEXT_LINK_CLASSES}`}
          >
            {t('list.myPublished')} ({myPublished.count})
          </Link>
        </div>
      )}

      {/* Kept on its own line directly above the list it orders. */}
      <div className="mt-3 mb-4 flex justify-end">
        <SharedGamesSort currentSort={sort} />
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{t('list.empty')}</p>
      ) : (
        <div className="space-y-3">
          {withRepeatingNativeAds(
            items.map((g) => (
              <SharedGameListCard
                key={g.id}
                game={g}
                likeMeta={likeMetaMap.get(g.id)}
                replyMeta={commentMetaMap.get(g.id) ?? EMPTY_REPLY_META}
                reviewed={reviewedIds.has(g.id)}
                aiReviewedBadgeLabel={t('list.aiReviewedBadge')}
                colorLabels={{
                  white: tPlay('playerColor.white'),
                  black: tPlay('playerColor.black'),
                }}
                resolveOpeningName={(slug, name) => getOpeningDisplayName(openingNameT, slug, name)}
                justNowLabel={justNowLabel}
                authorLabels={authorLabels}
                locale={locale}
              />
            )),
            nativeAdCreatives,
            (creative, key) => (
              <NativeAdCard key={key} creative={creative} locale={locale} variant="card" />
            )
          )}
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
    </PageLayout>
  );
}
