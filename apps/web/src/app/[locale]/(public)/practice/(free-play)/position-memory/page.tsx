/**
 * Position Memory — Problem List
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

import { Button } from '@/app/_components';
import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { Link } from '@/i18n/routing';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';
import { FaPlus } from 'react-icons/fa';

import { getOptionalUser } from '@/lib/auth';
import { getReplyMetaMap } from '@/lib/db/reply-meta-queries';
import { getPaginationParams } from '@/lib/pagination';
import { getPositionLikeMetaMap } from '@/lib/positions/like-queries';
import { countPositions, listPositionsWithProfile } from '@/lib/positions/queries';
import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';
import { truncate } from '@/lib/text';
import { resolveDisplayName } from '@/lib/users/display-name';

import { PostFooter } from '@/app/[locale]/(public)/topics/_components/PostFooter';
import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';
import {
  Divider,
  PagePanel,
  PageTitle,
  PaginationNav,
  SectionTitle,
} from '@/app/[locale]/_components';
import { ActivityCard } from '@/app/[locale]/_components/ActivityCard';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
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
  const totalCount = await countPositions({ type: 'memory' });

  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    PAGE_SIZE
  );

  const rows = await listPositionsWithProfile({ type: 'memory', limit, offset });

  const currentUser = await getOptionalUser();
  const positionIds = rows.map((r) => r.position.id);
  const [likeMetaMap, replyMetaMap] = await Promise.all([
    getPositionLikeMetaMap(positionIds, currentUser?.id),
    getReplyMetaMap('position_memory', positionIds),
  ]);

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
            className={`text-sm ${TEXT_LINK_CLASSES}`}
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
              const detailHref = `/practice/position-memory/${position.id}`;
              const likeMeta = likeMetaMap.get(position.id) ?? {
                likeCount: 0,
                likedByMe: false,
              };
              const replyMeta = replyMetaMap.get(position.id) ?? {
                replyCount: 0,
                latestReplyAt: null,
                repliers: [],
                uniqueReplierCount: 0,
              };

              return (
                <ActivityCard
                  key={position.id}
                  variant="card"
                  thumbnail={<ThemedBoardThumbnail fen={position.fen} className="w-full h-full" />}
                  author={
                    <UserAvatar
                      profileHref={profile?.username ? `/u/${profile.username}` : null}
                      avatarUrl={profile?.avatarUrl}
                      displayName={displayName}
                      locale={locale}
                      size="sm"
                    />
                  }
                  permalink={
                    <Link
                      href={detailHref}
                      locale={locale}
                      className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                    >
                      <time dateTime={position.createdAt.toISOString()}>
                        {formatRelativeTime(position.createdAt, locale, t('justNow'))}
                      </time>
                    </Link>
                  }
                  footer={
                    <PostFooter
                      postId={position.id}
                      locale={locale}
                      topicKey={position.id}
                      likeMeta={likeMeta}
                      replyMeta={replyMeta}
                      toggleLikeAction={toggleLike}
                      i18nNamespace="practice.positionMemory"
                      postHref={detailHref}
                    />
                  }
                >
                  <h3 className="font-medium text-foreground truncate mt-2">
                    <Link
                      href={detailHref}
                      locale={locale}
                      className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                    >
                      {position.title}
                    </Link>
                  </h3>
                  {descriptionExcerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {descriptionExcerpt}
                    </p>
                  )}
                </ActivityCard>
              );
            })}
          </div>
        )}

        <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />

        {currentUser && (
          <div className="py-4">
            <Link href="/practice/position-memory/new" locale={locale}>
              <Button asChild variant="primary" size="lg" icon={<FaPlus />} fullWidth>
                {t('list.createButton')}
              </Button>
            </Link>
          </div>
        )}

        {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
        )}

        <Divider />

        <Breadcrumb
          items={[{ label: tNav('practice'), href: '/practice' }, { label: t('list.title') }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
