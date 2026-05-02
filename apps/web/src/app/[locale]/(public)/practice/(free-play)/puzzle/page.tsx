/**
 * Puzzle — Problem List
 *
 * @description
 * Displays a paginated list of user-submitted puzzle positions.
 * Each card shows a board thumbnail, title, description excerpt,
 * and author information.
 *
 * @flow
 * 1. Browse the list of available puzzles
 * 2. Click a card to navigate to the puzzle detail page (not yet implemented)
 * 3. On the detail page, attempt to find the best move(s)
 */
import { getTranslations } from 'next-intl/server';

import { Button } from '@/app/_components';
import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { Link } from '@/i18n/routing';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';
import { FaPlus } from 'react-icons/fa';

import { getOptionalUser } from '@/lib/auth';
import { EMPTY_REPLY_META, getReplyMetaMap } from '@/lib/db/reply-meta-queries';
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
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });
  const title = t('list.title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/puzzle', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function PuzzleListPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page } = await searchParamsCache.parse(searchParams);
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });
  // PostFooter needs `like`/`unlike`/`newReply`/`justNow`, all defined under
  // the `.detail` sub-namespace. Reuse it here so the list-page timestamp
  // and the footer agree on the relative-time wording.
  const tDetail = await getTranslations({ locale, namespace: 'practice.puzzle.detail' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  // TODO: Consider a composite index on (type, deleted_at, created_at DESC)
  // if this query becomes slow with large data volumes.
  const totalCount = await countPositions({ type: 'puzzle' });

  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    PAGE_SIZE
  );

  const rows = await listPositionsWithProfile({ type: 'puzzle', limit, offset });

  const currentUser = await getOptionalUser();
  const positionIds = rows.map((r) => r.position.id);
  const [likeMetaMap, replyMetaMap] = await Promise.all([
    getPositionLikeMetaMap(positionIds, currentUser?.id),
    getReplyMetaMap('position_puzzle', positionIds),
  ]);

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/${locale}/practice/puzzle${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="space-y-8">
      <PageTitle>{t('list.title')}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('list.sectionTitle')}</SectionTitle>

        {rows.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t('list.empty')}</p>
        ) : (
          <div className="space-y-3">
            {rows.map(({ position, profile }) => {
              const displayName = resolveDisplayName(profile);
              const descriptionExcerpt = truncate(position.description);
              const detailHref = `/practice/puzzle/${position.id}`;
              const likeMeta = likeMetaMap.get(position.id) ?? {
                likeCount: 0,
                likedByMe: false,
              };
              const replyMeta = replyMetaMap.get(position.id) ?? EMPTY_REPLY_META;

              return (
                <ActivityCard
                  key={position.id}
                  variant="card"
                  href={detailHref}
                  locale={locale}
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
                        {formatRelativeTime(position.createdAt, locale, tDetail('justNow'))}
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
                      i18nNamespace="practice.puzzle.detail"
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
            <Link href="/practice/puzzle/new" locale={locale}>
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
