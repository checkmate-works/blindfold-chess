import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { createClient } from '@/lib/supabase/server';

import {
  Breadcrumb,
  Divider,
  PagePanel,
  PageTitle,
  PaginationNav,
  SectionTitle,
} from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SortTabs } from '../_components';
import type { SortMode } from '../_lib/queries';
import { getPostsWithReplyMeta } from '../_lib/queries';
import { isValidSquare } from '../_lib/squares';
import { PostCard, SquareHighlightBoard } from './_components';

const PAGE_SIZE = 5;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  sort: parseAsString.withDefault('new'),
});

type Props = {
  params: Promise<{ locale: Locale; square: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, square } = await params;

  if (!isValidSquare(square)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'metadata.topicsSquare' });

  return {
    ...generateCanonicalMetadata({ locale, path: `topics/squares/${square}` }),
    title: t('title', { square }),
    description: t('description', { square }),
  };
}

export default async function SquarePostsPage({ params, searchParams }: Props) {
  const { locale, square } = await params;

  if (!isValidSquare(square)) {
    notFound();
  }

  const { page, sort } = await searchParamsCache.parse(searchParams);
  const validSorts: SortMode[] = ['new', 'popular', 'active'];
  const sortBy: SortMode = validSorts.includes(sort as SortMode) ? (sort as SortMode) : 'new';

  const t = await getTranslations({ locale, namespace: 'topics' });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const allPosts = await getPostsWithReplyMeta(square, user?.id, sortBy);

  const totalCount = allPosts.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));
  const posts = allPosts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (sortBy !== 'new') params.set('sort', sortBy);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/${locale}/topics/squares/${square}${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="space-y-8">
      <PageTitle>{t('squares.pageTitle')}</PageTitle>

      <PagePanel>
        <SectionTitle>{square}</SectionTitle>

        <SquareHighlightBoard square={square} locale={locale} />

        <p className="text-sm text-muted-foreground">
          {t('squares.postCount', { count: totalCount })}
        </p>

        <div>
          <Link href={`/topics/squares/${square}/new`} locale={locale}>
            <Button variant="primary" asChild>
              {t('squares.newPost')}
            </Button>
          </Link>
        </div>

        <SortTabs square={square} locale={locale} />

        {posts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t('squares.noPosts')}</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} locale={locale} square={square} />
            ))}
          </div>
        )}

        <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />

        <Divider />

        <Breadcrumb
          items={[
            { label: t('title'), href: '/topics' },
            { label: t('squares.title'), href: '/topics/squares' },
            { label: square },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
