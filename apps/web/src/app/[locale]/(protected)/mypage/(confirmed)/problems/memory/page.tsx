/**
 * My Position Memory Problems (`/mypage/problems/memory`)
 *
 * @description
 * Lists position memory problems created by the authenticated user.
 * Provides a management view with board thumbnails, titles, descriptions,
 * and creation dates. Links to the public detail page for each position.
 *
 * @flow
 * 1. View paginated list of own positions (type: memory)
 * 2. Click a card to navigate to the public position detail page
 */
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';
import { FiEdit2 } from 'react-icons/fi';

import { getAuthenticatedUser } from '@/lib/auth';
import { EMPTY_REPLY_META, getReplyMetaMap } from '@/lib/db/reply-meta-queries';
import { getPaginationParams } from '@/lib/pagination';
import { getPositionLikeMetaMap } from '@/lib/positions/like-queries';
import { countPositions, listPositionsWithProfile } from '@/lib/positions/queries';

import { toggleLike } from '@/app/[locale]/(public)/practice/(free-play)/_actions/toggleLike';
import { PositionListCard } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionListCard';
import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps } from '@/app/[locale]/_lib/types';

const PAGE_SIZE = 12;
const FOOTER_NAMESPACE = 'practice.positionMemory';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

type Props = LocaleSearchPageProps;

export function generateMetadata({ params }: Props) {
  return createPageMetadata({
    params,
    namespace: 'metadata.mypageProblems',
    path: 'mypage/problems/memory',
    noIndex: true,
  });
}

export default async function PositionMemoryProblemsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypageProblems' });
  const tFooter = await getTranslations({ locale, namespace: FOOTER_NAMESPACE });

  const user = await getAuthenticatedUser();

  const { page } = await searchParamsCache.parse(searchParams);

  const totalCount = await countPositions({ type: 'memory', userId: user.id });
  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    PAGE_SIZE
  );
  const rows = await listPositionsWithProfile({ type: 'memory', userId: user.id, limit, offset });

  const positionIds = rows.map((r) => r.position.id);
  const [likeMetaMap, replyMetaMap] = await Promise.all([
    getPositionLikeMetaMap(positionIds, user.id),
    getReplyMetaMap('position_memory', positionIds),
  ]);

  const justNowLabel = tFooter('justNow');

  const buildHref = (p: number) => {
    const qs = p > 1 ? `?page=${p}` : '';
    return `/${locale}/mypage/problems/memory${qs}`;
  };

  return (
    <PageLayout
      title={t('title')}
      locale={locale}
      breadcrumb={[
        { label: t('breadcrumbMypage'), href: '/mypage' },
        { label: t('breadcrumbProblems'), href: '/mypage/problems' },
        { label: t('title') },
      ]}
    >
      <SectionTitle>{t('sectionTitle')}</SectionTitle>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">{t('empty')}</p>
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
                i18nNamespace={FOOTER_NAMESPACE}
                toggleLikeAction={toggleLike}
                justNowLabel={justNowLabel}
                locale={locale}
                actions={
                  <Link
                    href={`${detailHref}/edit`}
                    locale={locale}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:border-foreground/20 hover:text-foreground transition-colors"
                  >
                    <FiEdit2 className="h-3 w-3" aria-hidden />
                    {t('editAction')}
                  </Link>
                }
              />
            );
          })}
        </div>
      )}

      <PaginationNav
        currentPage={currentPage}
        totalPages={totalPages}
        buildHref={buildHref}
        locale={locale}
      />
    </PageLayout>
  );
}
