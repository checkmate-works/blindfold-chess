import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';

import {
  Divider,
  ListLink,
  ListLinkContainer,
  PagePanel,
  PageTitle,
  SectionTitle,
} from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
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

export const dynamic = 'force-dynamic';

const validCategories = Object.values(ARTICLE_CATEGORIES) as string[];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  if (!validCategories.includes(category)) {
    return {};
  }

  const categoryLabel = t(`learn.categories.${category}`);

  const title = t('learn.categoryTitle', { category: categoryLabel });
  const description = t('learn.description');

  return {
    ...generateCanonicalMetadata({ locale, path: `learn/${category}`, title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function LearnCategoryPage({ params }: Props) {
  const { locale, category } = await params;
  setRequestLocale(locale);

  if (!validCategories.includes(category)) {
    notFound();
  }

  const t = await getTranslations({ locale });
  const articles = await getArticlesByCategory(category as ArticleCategory, locale);

  const categoryLabel = t(`learn.categories.${category}`);

  return (
    <div className="space-y-8">
      <PageTitle>{categoryLabel}</PageTitle>

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

        {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
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
