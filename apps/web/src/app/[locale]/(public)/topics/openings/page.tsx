import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ADSENSE_SLOT_CONTENT_BOTTOM, ADSENSE_SLOT_CONTENT_MIDDLE, IS_LOCAL_DEV } from '@/config';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { getPaginationParams } from '@/lib/pagination';
import { createClient } from '@/lib/supabase/server';

import { TopicPostCard } from '@/app/[locale]/(public)/(home)/_components/TopicPostCard';
import { TOPIC_PAGE_SIZE } from '@/app/[locale]/(public)/topics/_lib/pagination';
import { isValidSquare } from '@/app/[locale]/(public)/topics/squares/_lib/squares';
import {
  Divider,
  PagePanel,
  PageTitle,
  PaginationNav,
  SectionTitle,
} from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps as Props } from '@/app/[locale]/_lib/types';

import {
  OpeningCard,
  OpeningCategoryFilter,
  OpeningCategorySectionTitle,
  OpeningsListByCategory,
} from './_components';
import { getOpeningDisplayName } from './_lib/get-opening-display-name';
import {
  getOpeningsAsTree,
  getOpeningsAsTreeByFirstMoveSquare,
  getPostCountAcrossOpenings,
  getPostCountByFirstMoveSquare,
  getPostsAcrossOpeningsPaginated,
  getPostsByFirstMoveSquarePaginated,
} from './_lib/queries';

export const dynamic = 'force-dynamic';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  first_move: parseAsString,
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.topicsOpenings' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'topics/openings', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function OpeningsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page, first_move } = await searchParamsCache.parse(searchParams);
  const t = await getTranslations({ locale, namespace: 'topics' });
  const tSquares = await getTranslations({ locale, namespace: 'topics.squares' });
  const tOpenings = await getTranslations({ locale, namespace: 'topics.openings' });
  const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstMoveSquare = first_move && isValidSquare(first_move) ? first_move : null;

  const totalCount = firstMoveSquare
    ? await getPostCountByFirstMoveSquare(firstMoveSquare)
    : await getPostCountAcrossOpenings();
  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    TOPIC_PAGE_SIZE
  );

  const recentPosts = firstMoveSquare
    ? await getPostsByFirstMoveSquarePaginated(firstMoveSquare, limit, offset, user?.id)
    : await getPostsAcrossOpeningsPaginated(limit, offset, user?.id);

  const openings = firstMoveSquare
    ? await getOpeningsAsTreeByFirstMoveSquare(firstMoveSquare)
    : await getOpeningsAsTree();

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (firstMoveSquare) params.set('first_move', firstMoveSquare);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/${locale}/topics/openings${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="space-y-8">
      <PageTitle>{t('openings.title')}</PageTitle>

      <PagePanel>
        {recentPosts.length > 0 && (
          <>
            <SectionTitle>{t('openings.recentPosts')}</SectionTitle>
            <div className="space-y-3">
              {recentPosts.map((post) => {
                const tTopic = post.topicType === 'opening' ? tOpenings : tSquares;
                return (
                  <TopicPostCard
                    key={post.id}
                    post={post}
                    locale={locale}
                    showMoreLabel={t('showMore')}
                    justNowLabel={tTopic('justNow')}
                    newReplyTemplate={tTopic('newReply', { time: '{time}' })}
                    variant="card"
                  />
                );
              })}
            </div>
            <PaginationNav
              currentPage={currentPage}
              totalPages={totalPages}
              buildHref={buildHref}
            />
          </>
        )}

        {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_MIDDLE) && (
          <AdSenseGuard slot="content-middle" slotId={ADSENSE_SLOT_CONTENT_MIDDLE ?? ''} />
        )}

        {firstMoveSquare
          ? currentPage === 1 && (
              <>
                <SectionTitle>
                  {t('openings.firstMoveFilter.title', { square: firstMoveSquare })}
                </SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {openings.map((opening) => (
                    <div key={opening.id}>
                      <OpeningCard
                        opening={opening}
                        displayName={getOpeningDisplayName(nameT, opening.slug, opening.name)}
                        locale={locale}
                      />
                      {opening.children.length > 0 && (
                        <div className="border-l-2 border-border ml-4 pl-2 mt-1 space-y-1">
                          {opening.children.map((child) => (
                            <OpeningCard
                              key={child.id}
                              opening={child}
                              displayName={getOpeningDisplayName(nameT, child.slug, child.name)}
                              locale={locale}
                              compact
                            />
                          ))}
                        </div>
                      )}
                    </div>
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

        {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
        )}

        <Divider />

        <Breadcrumb
          items={[{ label: t('title'), href: '/topics' }, { label: t('openings.title') }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
