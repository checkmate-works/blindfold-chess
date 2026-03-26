import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { createOpeningPostRateLimit, isRateLimited } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

import {
  buildPaginationHref,
  paginate,
  validateSort,
} from '@/app/[locale]/(public)/topics/_lib/pagination';
import {
  Divider,
  PagePanel,
  PageTitle,
  PaginationNav,
  SectionTitle,
} from '@/app/[locale]/_components';
import { AdBannerGuard } from '@/app/[locale]/_components/AdBanner/AdBannerGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { OpeningSortTabs } from '../_components';
import { OpeningBoardWithMoves } from '../_components/OpeningBoardWithMoves';
import { getOpeningBySlug, getOpeningPostsWithReplyMeta } from '../_lib/queries';
import { OpeningPostCard } from './_components';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 5;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  sort: parseAsString.withDefault('new'),
});

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const opening = await getOpeningBySlug(slug);

  if (!opening) {
    return {};
  }

  const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });
  const translated = nameT(slug as never);
  const displayName = translated === `topics.openings.names.${slug}` ? opening.name : translated;

  const t = await getTranslations({ locale, namespace: 'metadata.topicsOpeningDetail' });

  return {
    ...generateCanonicalMetadata({ locale, path: `topics/openings/${slug}` }),
    title: t('title', { name: displayName }),
    description: t('description', { name: displayName }),
  };
}

export default async function OpeningDetailPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const opening = await getOpeningBySlug(slug);

  if (!opening) {
    notFound();
  }

  const { page, sort } = await searchParamsCache.parse(searchParams);
  const sortBy = validateSort(sort);

  const t = await getTranslations({ locale, namespace: 'topics' });
  const dt = await getTranslations({ locale, namespace: 'topics.openings.detail' });
  const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });

  const translated = nameT(slug as never);
  const displayName = translated === `topics.openings.names.${slug}` ? opening.name : translated;

  // Fetch parent opening for breadcrumb if this is a child variation
  const parentOpening = opening.parentSlug ? await getOpeningBySlug(opening.parentSlug) : null;
  const parentDisplayName = parentOpening
    ? (() => {
        const translated = nameT(parentOpening.slug as never);
        return translated === `topics.openings.names.${parentOpening.slug}`
          ? parentOpening.name
          : translated;
      })()
    : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allPosts = await getOpeningPostsWithReplyMeta(slug, user?.id, sortBy);
  const {
    totalCount,
    totalPages,
    currentPage,
    paginatedItems: posts,
  } = paginate(allPosts, PAGE_SIZE, page);

  const buildHref = (p: number) =>
    buildPaginationHref(locale, `/topics/openings/${slug}`, p, sortBy);

  const showNewPostButton =
    !user || !(await isRateLimited(user.id, createOpeningPostRateLimit(slug)));

  return (
    <div className="space-y-8">
      <PageTitle>{dt('pageTitle')}</PageTitle>

      <PagePanel>
        <SectionTitle>{displayName}</SectionTitle>

        {currentPage === 1 && <OpeningBoardWithMoves fen={opening.fen} pgn={opening.pgn} />}

        <AdBannerGuard slot="banner-wide" />

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{dt('postCount', { count: totalCount })}</p>

          {showNewPostButton && (
            <Link href={`/topics/openings/${slug}/new`} locale={locale}>
              <Button variant="primary" asChild>
                {dt('newPost')}
              </Button>
            </Link>
          )}
        </div>

        <OpeningSortTabs slug={slug} locale={locale} />

        {posts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{dt('noPosts')}</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <OpeningPostCard key={post.id} post={post} locale={locale} slug={slug} />
            ))}
          </div>
        )}

        <AdBannerGuard slot="banner-standard" />

        <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />

        <Divider />

        <Breadcrumb
          items={[
            { label: t('title'), href: '/topics' },
            { label: t('openings.title'), href: '/topics/openings' },
            ...(parentOpening && parentDisplayName
              ? [
                  {
                    label: parentDisplayName,
                    href: `/topics/openings/${parentOpening.slug}`,
                  },
                ]
              : []),
            { label: displayName },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
