import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import {
  Breadcrumb,
  CardLink,
  Divider,
  PageDescription,
  PagePanel,
  PageTitle,
  SectionTitle,
} from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getCategoryIcon } from './_lib/constants';
import { getCategories } from './_lib/queries';

type Props = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'posts' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'posts' }),
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default async function PostsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'posts' });

  const categories = await getCategories();

  return (
    <div className="space-y-8">
      <PageTitle>{t('pageTitle')}</PageTitle>

      <PageDescription>{t('pageDescription')}</PageDescription>

      <PagePanel>
        <SectionTitle>{t('categoriesListTitle')}</SectionTitle>

        {categories.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t('noCategories')}</p>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => (
              <CardLink
                key={category.id}
                href={`/posts/${category.slug}`}
                icon={getCategoryIcon(category.slug)}
                title={t(`categories.${category.slug}` as 'categories.updates' | 'categories.blog')}
                description={t('categoryDescription', {
                  category: t(
                    `categories.${category.slug}` as 'categories.updates' | 'categories.blog'
                  ),
                })}
                locale={locale}
              />
            ))}
          </div>
        )}

        <Divider />

        <Breadcrumb items={[{ label: t('pageTitle') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
