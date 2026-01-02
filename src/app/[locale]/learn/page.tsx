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

import { generateCanonicalMetadata } from '../_lib/metadata';
import type { Locale } from '../_lib/types';
import { CategoryIndex } from './_components';
import { ARTICLE_ICONS, type ArticleSlug } from './_lib/types';
import { getAllArticles, getAvailableCategories, getCategoryCounts } from './_lib/utils';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'learn' }),
    title: t('learn.title'),
    description: t('learn.description'),
  };
}

export default async function LearnPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const articles = await getAllArticles(locale);
  const categoryCounts = await getCategoryCounts(locale);
  const availableCategories = getAvailableCategories();

  const categoryInfos = availableCategories.map((cat) => ({
    category: cat,
    label: t(`learn.categories.${cat}`),
    count: categoryCounts[cat],
  }));

  return (
    <div className="space-y-8">
      <PageTitle>{t('learn.title')}</PageTitle>

      <PageDescription>{t('learn.description')}</PageDescription>

      <CategoryIndex
        categories={categoryInfos}
        locale={locale}
        allLabel={t('learn.allCategories')}
        countLabel={(count) => t('learn.articleCount', { count })}
      />

      <SectionTitle>{t('learn.articlesTitle')}</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <CardLink
            key={article.slug}
            href={`/learn/${article.slug}`}
            icon={ARTICLE_ICONS[article.slug as ArticleSlug] || '📚'}
            title={article.title}
            description={article.excerpt}
            locale={locale}
          />
        ))}
      </div>

      <Divider />

      <Breadcrumb items={[{ label: t('navigation.learn') }]} locale={locale} />
    </div>
  );
}
