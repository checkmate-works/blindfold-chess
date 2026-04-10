/**
 * Position Memory — Problem List (ポジション記憶 — 問題一覧)
 *
 * @description
 * Displays a paginated list of user-submitted positions for the
 * position memory practice module. Each card shows a board thumbnail,
 * title, description excerpt, and author information.
 *
 * @flow
 * 1. Browse the list of available positions
 * 2. Click a card to navigate to the position detail page
 * 3. On the detail page, configure time limit and start a session
 */
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

import { Link } from '@/i18n/routing';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { getOptionalUser } from '@/lib/auth';
import { db, positions, profiles } from '@/lib/db';
import { resolveDisplayName } from '@/lib/display-name';
import { getPaginationParams } from '@/lib/pagination';
import { getPositionLikeMetaMap } from '@/lib/positions/like-queries';
import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';
import { truncate } from '@/lib/text';

import { LikeButton } from '@/app/[locale]/(public)/topics/_components/LikeButton';
import {
  Divider,
  PagePanel,
  PageTitle,
  PaginationNav,
  SectionTitle,
} from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps as Props } from '@/app/[locale]/_lib/types';

import { toggleLike } from './_actions/toggleLike';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });
  const title = t('list.title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/position-memory', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function PositionMemoryListPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page } = await searchParamsCache.parse(searchParams);
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  // TODO: Consider a composite index on (type, deleted_at, created_at DESC)
  // if this query becomes slow with large data volumes.
  const whereConditions = and(eq(positions.type, 'memory'), isNull(positions.deletedAt));

  const [totalResult] = await db.select({ value: count() }).from(positions).where(whereConditions);
  const totalCount = totalResult.value;

  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    PAGE_SIZE
  );

  const rows = await db
    .select({
      position: positions,
      profile: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(positions)
    .leftJoin(profiles, eq(positions.userId, profiles.id))
    .where(whereConditions)
    .orderBy(desc(positions.createdAt))
    .limit(limit)
    .offset(offset);

  const currentUser = await getOptionalUser();
  const likeMetaMap = await getPositionLikeMetaMap(
    rows.map((r) => r.position.id),
    currentUser?.id
  );

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/${locale}/practice/position-memory${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="space-y-8">
      <PageTitle>{t('list.title')}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('list.sectionTitle')}</SectionTitle>

        <div className="flex justify-end mb-4">
          <Link
            href="/practice/position-memory/tutorial"
            locale={locale}
            className="text-sm text-link-primary hover:underline"
          >
            {t('list.tutorialLink')}
          </Link>
        </div>

        {rows.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t('list.empty')}</p>
        ) : (
          <div className="space-y-3">
            {rows.map(({ position, profile }) => {
              const displayName = resolveDisplayName(profile);
              const descriptionExcerpt = truncate(position.description);
              const likeMeta = likeMetaMap.get(position.id) ?? {
                likeCount: 0,
                likedByMe: false,
              };

              return (
                <Link
                  key={position.id}
                  href={`/practice/position-memory/${position.id}`}
                  locale={locale}
                  className="block p-4 rounded-md border border-border bg-card hover:border-foreground/20 transition-colors"
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
                      <BoardThumbnail fen={position.fen} className="w-full h-full" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {profile?.avatarUrl ? (
                          <Image
                            src={profile.avatarUrl}
                            alt={displayName}
                            width={24}
                            height={24}
                            className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                            unoptimized
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {displayName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="font-medium text-foreground">{displayName}</span>
                        <span className="whitespace-nowrap">{t('list.submittedBy')}</span>
                      </div>
                      <h3 className="font-medium text-foreground truncate">{position.title}</h3>
                      {descriptionExcerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {descriptionExcerpt}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                    <LikeButton
                      postId={position.id}
                      locale={locale}
                      topicKey=""
                      initialLikeCount={likeMeta.likeCount}
                      initialLikedByMe={likeMeta.likedByMe}
                      toggleLikeAction={toggleLike}
                      i18nNamespace="practice.positionMemory"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />

        <Divider />

        <Breadcrumb
          items={[{ label: tNav('practice'), href: '/practice' }, { label: t('list.title') }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
