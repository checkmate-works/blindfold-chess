import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';

import { createClient } from '@/lib/supabase/server';

import {
  Breadcrumb,
  Divider,
  PagePanel,
  PageTitle,
  SectionTitle,
} from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SortTabs } from '../_components';
import type { SortMode } from '../_lib/queries';
import { getPostsWithReplyMeta } from '../_lib/queries';
import { isValidSquare } from '../_lib/squares';
import { PostCard, SquareHighlightBoard } from './_components';

type Props = {
  params: Promise<{ locale: Locale; square: string }>;
  searchParams: Promise<{ sort?: string }>;
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

  const { sort } = await searchParams;
  const validSorts: SortMode[] = ['new', 'popular', 'active'];
  const sortBy: SortMode = validSorts.includes(sort as SortMode) ? (sort as SortMode) : 'new';

  const t = await getTranslations({ locale, namespace: 'topics' });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const posts = await getPostsWithReplyMeta(square, user?.id, sortBy);

  return (
    <div className="space-y-8">
      <PageTitle>{t('squares.pageTitle')}</PageTitle>

      <PagePanel>
        <SectionTitle>{square}</SectionTitle>

        <SquareHighlightBoard square={square} />

        <p className="text-sm text-muted-foreground">
          {t('squares.postCount', { count: posts.length })}
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
