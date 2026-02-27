import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import {
  Breadcrumb,
  Divider,
  ListLink,
  ListLinkContainer,
  PageDescription,
  PagePanel,
  PageTitle,
  SectionTitle,
} from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getCategoryIcon } from '../_lib/constants';
import { getCategoryBySlug, getPublishedPostsByCategory } from '../_lib/queries';

type Props = {
  params: Promise<{ locale: Locale; category: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  const t = await getTranslations({ locale, namespace: 'posts' });

  const categoryData = await getCategoryBySlug(category);
  if (!categoryData) {
    return { title: 'Not Found' };
  }

  const categoryLabel = t(`categories.${category}`);

  return {
    ...generateCanonicalMetadata({ locale, path: `posts/${category}` }),
    title: `${categoryLabel} - ${t('pageTitle')}`,
    description: t('categoryDescription', { category: categoryLabel }),
  };
}

export default async function CategoryPostsPage({ params }: Props) {
  const { locale, category } = await params;
  const t = await getTranslations({ locale, namespace: 'posts' });

  const categoryData = await getCategoryBySlug(category);
  if (!categoryData) {
    notFound();
  }

  const posts = await getPublishedPostsByCategory(category);
  const categoryLabel = t(`categories.${category}`);

  return (
    <div className="space-y-8">
      <PageTitle>{categoryLabel}</PageTitle>

      <PageDescription>{t('categoryDescription', { category: categoryLabel })}</PageDescription>

      <PagePanel>
        <SectionTitle>{t('postsListTitle')}</SectionTitle>

        {posts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t('noPosts')}</p>
        ) : (
          <ListLinkContainer>
            {posts.map((post) => {
              const publishedDate = post.publishedAt
                ? new Date(post.publishedAt).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : undefined;

              return (
                <ListLink
                  key={post.id}
                  href={`/posts/${category}/${post.slug}`}
                  icon={getCategoryIcon(category)}
                  title={post.title}
                  meta={publishedDate}
                  locale={locale}
                  isPinned={post.pinnedAt !== null}
                />
              );
            })}
          </ListLinkContainer>
        )}

        <Divider />

        <Breadcrumb
          items={[{ label: t('pageTitle'), href: '/posts' }, { label: categoryLabel }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
