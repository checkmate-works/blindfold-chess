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

import { generateCanonicalMetadata } from '../../../_lib/metadata';
import type { Locale } from '../../../_lib/types';
import { CategoryIndex } from '../../_components';
import {
  ARTICLE_CATEGORIES,
  ARTICLE_ICONS,
  type ArticleCategory,
  type ArticleSlug,
} from '../../_lib/types';
import { getArticlesByCategory, getAvailableCategories, getCategoryCounts } from '../../_lib/utils';

type Props = {
  params: Promise<{
    locale: Locale;
    category: string;
  }>;
};

const validCategories = Object.values(ARTICLE_CATEGORIES) as string[];

export async function generateStaticParams() {
  return validCategories.map((category) => ({ category }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  const t = await getTranslations({ locale });

  if (!validCategories.includes(category)) {
    return {};
  }

  const categoryLabel = t(`learn.categories.${category}`);

  return {
    ...generateCanonicalMetadata({ locale, path: `learn/category/${category}` }),
    title: t('learn.categoryTitle', { category: categoryLabel }),
    description: t('learn.description'),
  };
}

export default async function LearnCategoryPage({ params }: Props) {
  const { locale, category } = await params;

  if (!validCategories.includes(category)) {
    notFound();
  }

  const t = await getTranslations({ locale });
  const articles = await getArticlesByCategory(category as ArticleCategory, locale);
  const categoryCounts = await getCategoryCounts(locale);
  const availableCategories = getAvailableCategories();

  const categoryLabel = t(`learn.categories.${category}`);

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
        selectedCategory={category as ArticleCategory}
        locale={locale}
        allLabel={t('learn.allCategories')}
        countLabel={(count) => t('learn.articleCount', { count })}
      />

      <SectionTitle>{t('learn.categoryTitle', { category: categoryLabel })}</SectionTitle>

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

      {articles.length === 0 && (
        <p className="text-muted-foreground text-center py-8">No articles in this category yet.</p>
      )}

      <Divider />

      <Breadcrumb
        items={[{ label: t('navigation.learn'), href: '/learn' }, { label: categoryLabel }]}
        locale={locale}
      />
    </div>
  );
}
