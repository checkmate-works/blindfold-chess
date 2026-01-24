import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import {
  Breadcrumb,
  CardLink,
  Divider,
  PageDescription,
  PageTitle,
  SectionTitle,
} from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getCategoryIcon } from './_lib/constants';
import { getPublishedPosts } from './_lib/queries';

type Props = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'posts' });

  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default async function PostsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'posts' });

  const posts = await getPublishedPosts();

  return (
    <div className="space-y-8">
      <PageTitle>{t('pageTitle')}</PageTitle>

      <PageDescription>{t('pageDescription')}</PageDescription>

      <SectionTitle>{t('postsListTitle')}</SectionTitle>

      {posts.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">{t('noPosts')}</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <CardLink
              key={post.id}
              href={`/posts/${post.category.slug}/${post.slug}`}
              icon={getCategoryIcon(post.category.slug)}
              title={post.title}
              description={post.content.replace(/^#.*\n/, '').slice(0, 100)}
              locale={locale}
            />
          ))}
        </div>
      )}

      <Divider />

      <Breadcrumb items={[{ label: t('pageTitle') }]} locale={locale} />
    </div>
  );
}
