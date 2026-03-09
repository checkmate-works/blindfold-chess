import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';

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

import {
  ARTICLE_CATEGORIES,
  ARTICLE_ICONS,
  type ArticleCategory,
  type ArticleSlug,
} from '../_lib/types';
import { getArticlesByCategory } from '../_lib/utils';

type Props = {
  params: Promise<{
    locale: Locale;
    category: string;
  }>;
};

export const dynamic = 'force-static';

const validCategories = Object.values(ARTICLE_CATEGORIES) as string[];
export async function generateStaticParams() {
  return validCategories.flatMap((category) =>
    SUPPORTED_LOCALES.map((locale) => ({
      locale,
      category,
    }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  const t = await getTranslations({ locale });

  if (!validCategories.includes(category)) {
    return {};
  }

  const categoryLabel = t(`learn.categories.${category}`);

  return {
    ...generateCanonicalMetadata({ locale, path: `learn/${category}` }),
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

  const categoryLabel = t(`learn.categories.${category}`);

  return (
    <div className="space-y-8">
      <PageTitle>{categoryLabel}</PageTitle>

      <PageDescription>{t('learn.description')}</PageDescription>

      <PagePanel>
        <SectionTitle>{t('learn.articlesTitle')}</SectionTitle>

        {articles.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t('learn.noArticles')}</p>
        ) : (
          <ListLinkContainer>
            {articles.map((article) => (
              <ListLink
                key={article.slug}
                href={`/learn/${category}/${article.slug}`}
                icon={ARTICLE_ICONS[article.slug as ArticleSlug] || '📚'}
                title={article.title}
                locale={locale}
              />
            ))}
          </ListLinkContainer>
        )}

        <Divider />

        <Breadcrumb
          items={[{ label: t('navigation.learn'), href: '/learn' }, { label: categoryLabel }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
