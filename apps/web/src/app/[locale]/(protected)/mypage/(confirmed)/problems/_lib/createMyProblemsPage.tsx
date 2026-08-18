import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';
import { FiEdit2 } from 'react-icons/fi';

import { getAuthenticatedUser } from '@/lib/auth';
import { EMPTY_LIKE_META } from '@/lib/db/like-queries';
import { EMPTY_REPLY_META, getReplyMetaMap } from '@/lib/db/reply-meta-queries';
import { getPaginationParams } from '@/lib/pagination';
import { getPositionLikeMetaMap } from '@/lib/positions/like-queries';
import { countPositions, listPositionsWithProfile } from '@/lib/positions/queries';
import type { PositionType } from '@/lib/positions/types';

import { toggleLike } from '@/app/[locale]/(public)/practice/(free-play)/_actions/toggleLike';
import { PositionListCard } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionListCard';
import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps } from '@/app/[locale]/_lib/types';

const PAGE_SIZE = 12;

/**
 * Config for a "My problems" management list page. The Position Memory and
 * Puzzle variants are identical except for these discriminating values, so
 * both routes delegate to `createMyProblemsPage` — each route file keeps its
 * own URL segment (a distinct route is required) but shrinks to a thin spec.
 */
export type MyProblemsPageConfig = {
  /** `positions` discriminator for the list/count queries. */
  positionType: Extract<PositionType, 'memory' | 'puzzle'>;
  /** `topic_posts.topic_type` used to fetch reply meta for these positions. */
  replyMetaType: string;
  /** i18n namespace for page chrome (title / breadcrumb / empty / actions). */
  listNamespace: string;
  /** i18n namespace forwarded to `PositionListCard` / `justNow` label. */
  footerNamespace: string;
  /** i18n namespace for `generateMetadata`. */
  metadataNamespace: string;
  /** URL sub-path under `mypage/problems/` (e.g. `memory`, `puzzles`). */
  pathSegment: string;
  /** Public detail-page prefix under `/practice/` (e.g. `position-memory`). */
  detailPathPrefix: string;
};

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

/**
 * Build the `{ generateMetadata, MyProblemsPage }` pair for a "My problems"
 * route from its discriminating spec. See {@link MyProblemsPageConfig}.
 */
export function createMyProblemsPage(config: MyProblemsPageConfig) {
  const {
    positionType,
    replyMetaType,
    listNamespace,
    footerNamespace,
    metadataNamespace,
    pathSegment,
    detailPathPrefix,
  } = config;

  function generateMetadata({ params }: LocaleSearchPageProps) {
    return createPageMetadata({
      params,
      namespace: metadataNamespace,
      path: `mypage/problems/${pathSegment}`,
      noIndex: true,
    });
  }

  async function MyProblemsPage({ params, searchParams }: LocaleSearchPageProps) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: listNamespace });
    const tFooter = await getTranslations({ locale, namespace: footerNamespace });

    const user = await getAuthenticatedUser();

    const { page } = await searchParamsCache.parse(searchParams);

    const totalCount = await countPositions({ type: positionType, userId: user.id });
    const { currentPage, totalPages, limit, offset } = getPaginationParams(
      page,
      totalCount,
      PAGE_SIZE
    );
    const rows = await listPositionsWithProfile({
      type: positionType,
      userId: user.id,
      limit,
      offset,
    });

    const positionIds = rows.map((r) => r.position.id);
    const [likeMetaMap, replyMetaMap] = await Promise.all([
      getPositionLikeMetaMap(positionIds, user.id),
      getReplyMetaMap(replyMetaType, positionIds),
    ]);

    const justNowLabel = tFooter('justNow');

    const buildHref = (p: number) => {
      const qs = p > 1 ? `?page=${p}` : '';
      return `/${locale}/mypage/problems/${pathSegment}${qs}`;
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
              const detailHref = `/practice/${detailPathPrefix}/${position.id}`;
              return (
                <PositionListCard
                  key={position.id}
                  position={position}
                  profile={profile}
                  likeMeta={likeMetaMap.get(position.id) ?? EMPTY_LIKE_META}
                  replyMeta={replyMetaMap.get(position.id) ?? EMPTY_REPLY_META}
                  detailHref={detailHref}
                  i18nNamespace={footerNamespace}
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

  return { generateMetadata, MyProblemsPage };
}
