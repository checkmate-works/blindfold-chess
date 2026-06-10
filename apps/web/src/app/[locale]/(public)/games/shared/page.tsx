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
import { listSharedGames } from '@/lib/db/games';
import { GAME_LIKE_TARGET, getLikeMetaMap } from '@/lib/db/like-queries';
import { EMPTY_REPLY_META, getGameCommentMetaMap } from '@/lib/db/reply-meta-queries';

import { getOpeningDisplayName } from '@/app/[locale]/(public)/topics/openings/_lib/get-opening-display-name';
import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { CatalogListCard } from '@/app/[locale]/_components/CatalogListCard';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GamesTabs } from '../_components/GamesTabs';
import { toggleGameLikeAction } from './[id]/_actions/game-like';
import { OpeningTag } from './_components/OpeningTag';
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

  const sort = parseSharedGamesSort((await searchParams).sort);
  const items = await listSharedGames(sort);

  const currentUser = await getOptionalUser();
  const ids = items.map((g) => g.id);
  const [likeMetaMap, commentMetaMap] = await Promise.all([
    getLikeMetaMap(GAME_LIKE_TARGET, ids, currentUser?.id),
    getGameCommentMetaMap(ids),
  ]);
  const justNowLabel = t('detail.justNow');
  const openingNameT = await getTranslations({ locale, namespace: 'topics.openings.names' });

  return (
    <PageLayout title={t('list.title')} locale={locale}>
      <SectionTitle>{t('list.sectionTitle')}</SectionTitle>
      <div className="mb-6">
        <GamesTabs active="shared" locale={locale} />
      </div>
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
              badge={
                g.opening ? (
                  <OpeningTag
                    compact
                    slug={g.opening.slug}
                    displayName={getOpeningDisplayName(
                      openingNameT,
                      g.opening.slug,
                      g.opening.name
                    )}
                    ecoCode={g.opening.ecoCode}
                    locale={locale}
                  />
                ) : undefined
              }
            />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
