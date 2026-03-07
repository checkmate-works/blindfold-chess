import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import {
  Breadcrumb,
  Divider,
  PageDescription,
  PagePanel,
  PageTitle,
  SectionTitle,
} from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PostCard, SquareBoard } from './_components';
import { getRecentPostsAcrossSquares } from './_lib/queries';

type Props = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.topicsSquares' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'topics/squares' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function SquaresPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'topics' });
  const recentPosts = await getRecentPostsAcrossSquares();

  return (
    <div className="space-y-8">
      <PageTitle>{t('squares.title')}</PageTitle>

      <PageDescription>{t('squares.description')}</PageDescription>

      <PagePanel>
        <SquareBoard locale={locale} />

        <SectionTitle>{t('squares.recentPosts')}</SectionTitle>

        {recentPosts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t('squares.noRecentPosts')}</p>
        ) : (
          <div className="space-y-3">
            {recentPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                locale={locale}
                square={post.topicKey}
                showSquareBadge
              />
            ))}
          </div>
        )}

        <Divider />

        <Breadcrumb
          items={[{ label: t('title'), href: '/topics' }, { label: t('squares.title') }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
