/**
 * My Puzzles (`/mypage/problems/puzzles`)
 *
 * @description
 * Lists puzzle problems created by the authenticated user.
 * Provides a management view with board thumbnails, titles, descriptions,
 * and creation dates. Links to the public puzzle detail page for each position.
 *
 * @flow
 * 1. View paginated list of own positions (type: puzzle)
 * 2. Click a card to navigate to the public puzzle detail page
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';
import { FiEdit2 } from 'react-icons/fi';

import { getAuthenticatedUser } from '@/lib/auth';
import { getPaginationParams } from '@/lib/pagination';
import { countPositions, listPositionsWithProfile } from '@/lib/positions/queries';
import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';
import { truncate } from '@/lib/text';

import { PageLayout, PaginationNav, SectionTitle } from '@/app/[locale]/_components';
import { ActivityCard } from '@/app/[locale]/_components/ActivityCard';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps } from '@/app/[locale]/_lib/types';

const PAGE_SIZE = 12;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

type Props = LocaleSearchPageProps;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.mypagePuzzles' });

  return {
    title: resolveTitle(t('title'), locale),
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

export default async function PuzzleProblemsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypagePuzzles' });

  const user = await getAuthenticatedUser();

  const { page } = await searchParamsCache.parse(searchParams);

  const totalCount = await countPositions({ type: 'puzzle', userId: user.id });
  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    PAGE_SIZE
  );
  const rows = await listPositionsWithProfile({ type: 'puzzle', userId: user.id, limit, offset });

  const buildHref = (p: number) => {
    const qs = p > 1 ? `?page=${p}` : '';
    return `/${locale}/mypage/problems/puzzles${qs}`;
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
          {rows.map(({ position }) => {
            const detailHref = `/practice/puzzle/${position.id}`;
            const editHref = `${detailHref}/edit`;
            const descriptionExcerpt = truncate(position.description);

            return (
              <ActivityCard
                key={position.id}
                variant="card"
                href={detailHref}
                locale={locale}
                thumbnail={<ThemedBoardThumbnail fen={position.fen} className="w-full h-full" />}
                author={null}
                permalink={
                  <time dateTime={position.createdAt.toISOString()}>
                    {new Date(position.createdAt).toLocaleDateString(locale, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                }
                footer={
                  <Link
                    href={editHref}
                    locale={locale}
                    className="mt-2 inline-flex items-center gap-1 self-start rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:border-foreground/20 hover:text-foreground transition-colors"
                  >
                    <FiEdit2 className="h-3 w-3" aria-hidden />
                    {t('editAction')}
                  </Link>
                }
              >
                <h3 className="font-medium text-foreground truncate">{position.title}</h3>
                {descriptionExcerpt && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{descriptionExcerpt}</p>
                )}
              </ActivityCard>
            );
          })}
        </div>
      )}

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </PageLayout>
  );
}
