/**
 * Forks of a Position Memory entry (`/practice/position-memory/[id]/forks`)
 *
 * @description
 * Mirror of the puzzle /forks page for the position-memory route. Paginated
 * listing of every fork that descends from a single position-memory row;
 * linked from the detail page's header note ("N forks") whenever the
 * source has at least one descendant. 404 when the source row is missing
 * or has been soft-deleted.
 *
 * @flow
 * 1. Resolve parent position (404 if missing / soft-deleted)
 * 2. Count descendants, derive pagination
 * 3. Render PositionListCard for each fork on the current page
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { getOptionalUser } from '@/lib/auth';
import { EMPTY_REPLY_META, getReplyMetaMap } from '@/lib/db/reply-meta-queries';
import { getPaginationParams } from '@/lib/pagination';
import { getPositionLikeMetaMap } from '@/lib/positions/like-queries';
import { countPositions, getPositionById, listPositionsWithProfile } from '@/lib/positions/queries';

import { toggleLike } from '@/app/[locale]/(public)/practice/(free-play)/_actions/toggleLike';
import { PageLayout, PaginationNav, SectionTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PositionListCard } from '../../../_components/PositionListCard';

const PAGE_SIZE = 20;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });
  const parent = await getPositionById({ id, type: 'memory' });
  if (!parent) return { title: t('forksList.title') };
  const title = t('forksList.titleOf', { parentTitle: parent.title });
  return {
    ...generateCanonicalMetadata({ locale, path: `practice/position-memory/${id}/forks`, title }),
    title: resolveTitle(title, locale),
  };
}

export default async function PositionMemoryForksListPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const { page } = await searchParamsCache.parse(searchParams);

  const parent = await getPositionById({ id, type: 'memory' });
  if (!parent) notFound();

  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  const totalCount = await countPositions({ type: 'memory', forkedFromId: id });
  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    PAGE_SIZE
  );
  const rows = await listPositionsWithProfile({
    type: 'memory',
    forkedFromId: id,
    limit,
    offset,
  });

  const currentUser = await getOptionalUser();
  const positionIds = rows.map((r) => r.position.id);
  const [likeMetaMap, replyMetaMap] =
    positionIds.length > 0
      ? await Promise.all([
          getPositionLikeMetaMap(positionIds, currentUser?.id),
          getReplyMetaMap('position_memory', positionIds),
        ])
      : [new Map(), new Map()];

  const justNowLabel = t('justNow');
  const buildHref = (p: number) => {
    const qs = p > 1 ? `?page=${p}` : '';
    return `/${locale}/practice/position-memory/${id}/forks${qs}`;
  };

  return (
    <PageLayout
      title={t('forksList.titleOf', { parentTitle: parent.title })}
      locale={locale}
      breadcrumb={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('list.title'), href: '/practice/position-memory' },
        { label: parent.title, href: `/practice/position-memory/${id}` },
        { label: t('forksList.breadcrumb') },
      ]}
    >
      <SectionTitle>{t('forksList.sectionTitle', { count: totalCount })}</SectionTitle>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">{t('forksList.empty')}</p>
      ) : (
        <div className="space-y-3">
          {rows.map(({ position, profile }) => {
            const detailHref = `/practice/position-memory/${position.id}`;
            return (
              <PositionListCard
                key={position.id}
                position={position}
                profile={profile}
                likeMeta={likeMetaMap.get(position.id) ?? { likeCount: 0, likedByMe: false }}
                replyMeta={replyMetaMap.get(position.id) ?? EMPTY_REPLY_META}
                detailHref={detailHref}
                i18nNamespace="practice.positionMemory"
                toggleLikeAction={toggleLike}
                justNowLabel={justNowLabel}
                locale={locale}
              />
            );
          })}
        </div>
      )}

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </PageLayout>
  );
}
