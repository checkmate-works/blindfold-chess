/**
 * My Puzzles (マイパズル — `/mypage/problems/puzzles`)
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

import { getAuthenticatedUser } from '@/lib/auth';
import { getPaginationParams } from '@/lib/pagination';
import { countPositions, listPositionsWithProfile } from '@/lib/positions/queries';
import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';
import { truncate } from '@/lib/text';

import {
  Divider,
  PagePanel,
  PageTitle,
  PaginationNav,
  SectionTitle,
} from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';

const PAGE_SIZE = 12;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>
      <PagePanel>
        <SectionTitle>{t('sectionTitle')}</SectionTitle>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t('empty')}</p>
        ) : (
          <div className="space-y-3">
            {rows.map(({ position }) => {
              const descriptionExcerpt = truncate(position.description);

              return (
                <Link
                  key={position.id}
                  href={`/practice/puzzle/${position.id}`}
                  locale={locale}
                  className="block p-4 rounded-md border border-border bg-card hover:border-foreground/20 transition-colors"
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
                      <ThemedBoardThumbnail fen={position.fen} className="w-full h-full" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <h3 className="font-medium text-foreground truncate">{position.title}</h3>
                      {descriptionExcerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {descriptionExcerpt}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-auto">
                        {new Date(position.createdAt).toLocaleDateString(locale, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />

        <Divider />

        <Breadcrumb
          locale={locale}
          items={[
            { label: t('breadcrumbMypage'), href: '/mypage' },
            { label: t('breadcrumbProblems'), href: '/mypage/problems' },
            { label: t('title') },
          ]}
        />
      </PagePanel>
    </div>
  );
}
