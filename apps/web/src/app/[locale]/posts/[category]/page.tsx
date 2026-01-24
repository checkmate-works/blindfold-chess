import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import {
  Breadcrumb,
  CardLink,
  Divider,
  PageDescription,
  PageTitle,
  SectionTitle,
} from '@/app/[locale]/_components';
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

      <SectionTitle>{t('postsListTitle')}</SectionTitle>

      {posts.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">{t('noPosts')}</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <CardLink
              key={post.id}
              href={`/posts/${category}/${post.slug}`}
              icon={getCategoryIcon(category)}
              title={post.title}
              description={post.content.replace(/^#.*\n/, '').slice(0, 100)}
              locale={locale}
            />
          ))}
        </div>
      )}

      <Divider />

      <Breadcrumb
        items={[{ label: t('pageTitle'), href: '/posts' }, { label: categoryLabel }]}
        locale={locale}
      />
    </div>
  );
}
