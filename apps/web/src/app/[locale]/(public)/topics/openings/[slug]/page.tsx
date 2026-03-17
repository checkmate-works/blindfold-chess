import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { createOpeningPostRateLimit, isRateLimited } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

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

import { OpeningSortTabs } from '../_components';
import { OpeningBoardWithMoves } from '../_components/OpeningBoardWithMoves';
import type { SortMode } from '../_lib/queries';
import { getOpeningBySlug, getOpeningPostsWithReplyMeta } from '../_lib/queries';
import { OpeningPostCard } from './_components';

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
  const validSorts: SortMode[] = ['new', 'popular', 'active'];
  const sortBy: SortMode = validSorts.includes(sort as SortMode) ? (sort as SortMode) : 'new';

  const t = await getTranslations({ locale, namespace: 'topics' });
  const dt = await getTranslations({ locale, namespace: 'topics.openings.detail' });
  const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });

  const translated = nameT(slug as never);
  const displayName = translated === `topics.openings.names.${slug}` ? opening.name : translated;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allPosts = await getOpeningPostsWithReplyMeta(slug, user?.id, sortBy);

  const totalCount = allPosts.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));
  const posts = allPosts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (sortBy !== 'new') params.set('sort', sortBy);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/${locale}/topics/openings/${slug}${qs ? `?${qs}` : ''}`;
  };

  const showNewPostButton =
    !user || !(await isRateLimited(user.id, createOpeningPostRateLimit(slug)));

  return (
    <div className="space-y-8">
      <PageTitle>{dt('pageTitle')}</PageTitle>

      <PagePanel>
        <SectionTitle>{displayName}</SectionTitle>

        <OpeningBoardWithMoves fen={opening.fen} pgn={opening.pgn} />

        <p className="text-sm text-muted-foreground">{dt('postCount', { count: totalCount })}</p>

        {showNewPostButton && (
          <div>
            <Link href={`/topics/openings/${slug}/new`} locale={locale}>
              <Button variant="primary" asChild>
                {dt('newPost')}
              </Button>
            </Link>
          </div>
        )}

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

        <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />

        <Divider />

        <Breadcrumb
          items={[
            { label: t('title'), href: '/topics' },
            { label: t('openings.title'), href: '/topics/openings' },
            { label: displayName },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
