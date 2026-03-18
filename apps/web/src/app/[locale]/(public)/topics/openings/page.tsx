import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { createClient } from '@/lib/supabase/server';

import { TopicPostCard } from '@/app/[locale]/(public)/(home)/_components/TopicPostCard';
import { isValidSquare } from '@/app/[locale]/(public)/topics/squares/_lib/squares';
import {
  Divider,
  PagePanel,
  PageTitle,
  PaginationNav,
  SectionTitle,
} from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import {
  OpeningCard,
  OpeningCategoryFilter,
  OpeningCategorySectionTitle,
  OpeningsListByCategory,
} from './_components';
import {
  getOpenings,
  getOpeningsByFirstMoveSquare,
  getPostCountAcrossOpenings,
  getPostCountByFirstMoveSquare,
  getPostsAcrossOpeningsPaginated,
  getPostsByFirstMoveSquarePaginated,
} from './_lib/queries';

const PAGE_SIZE = 5;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  first_move: parseAsString,
});

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.topicsOpenings' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'topics/openings' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function OpeningsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page, first_move } = await searchParamsCache.parse(searchParams);
  const t = await getTranslations({ locale, namespace: 'topics' });
  const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstMoveSquare = first_move && isValidSquare(first_move) ? first_move : null;

  const totalCount = firstMoveSquare
    ? await getPostCountByFirstMoveSquare(firstMoveSquare)
    : await getPostCountAcrossOpenings();
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));

  const recentPosts = firstMoveSquare
    ? await getPostsByFirstMoveSquarePaginated(
        firstMoveSquare,
        PAGE_SIZE,
        (currentPage - 1) * PAGE_SIZE,
        user?.id
      )
    : await getPostsAcrossOpeningsPaginated(PAGE_SIZE, (currentPage - 1) * PAGE_SIZE, user?.id);

  const openings = firstMoveSquare
    ? await getOpeningsByFirstMoveSquare(firstMoveSquare)
    : await getOpenings();

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (firstMoveSquare) params.set('first_move', firstMoveSquare);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/${locale}/topics/openings${qs ? `?${qs}` : ''}`;
  };

  const getDisplayName = (slug: string, fallback: string) => {
    const translated = nameT(slug as never);
    return translated === `topics.openings.names.${slug}` ? fallback : translated;
  };

  return (
    <div className="space-y-8">
      <PageTitle>{t('openings.title')}</PageTitle>

      <PagePanel>
        {firstMoveSquare
          ? currentPage === 1 && (
              <>
                <SectionTitle>
                  {t('openings.firstMoveFilter.title', { square: firstMoveSquare })}
                </SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {openings.map((opening) => (
                    <OpeningCard
                      key={opening.id}
                      opening={opening}
                      displayName={getDisplayName(opening.slug, opening.name)}
                      locale={locale}
                    />
                  ))}
                </div>
              </>
            )
          : currentPage === 1 && (
              <Suspense>
                <OpeningCategorySectionTitle />
                <OpeningCategoryFilter />
                <OpeningsListByCategory openings={openings} locale={locale} />
              </Suspense>
            )}

        <SectionTitle>{t('openings.recentPosts')}</SectionTitle>

        {recentPosts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t('openings.noRecentPosts')}</p>
        ) : (
          <div className="space-y-3">
            {recentPosts.map((post) => (
              <TopicPostCard key={post.id} post={post} locale={locale} />
            ))}
          </div>
        )}

        <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />

        <Divider />

        <Breadcrumb
          items={[{ label: t('title'), href: '/topics' }, { label: t('openings.title') }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
