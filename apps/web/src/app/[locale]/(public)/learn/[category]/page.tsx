import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';
import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

import {
  Divider,
  ListLink,
  ListLinkContainer,
  PageLayout,
  PagePanel,
  PageTitle,
  SectionTitle,
} from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
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

const validCategories = Object.values(ARTICLE_CATEGORIES) as string[];

export function generateStaticParams(): { locale: Locale; category: string }[] {
  return SUPPORTED_LOCALES.flatMap((locale) =>
    Object.values(ARTICLE_CATEGORIES).map((category) => ({ locale, category }))
  );
}

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

async function LearnCategoryContent({ params }: Props) {
  const { locale, category } = await params;
  setRequestLocale(locale);

  if (!validCategories.includes(category)) {
    notFound();
  }

  const t = await getTranslations({ locale });
  const articles = await getArticlesByCategory(category as ArticleCategory, locale);

  const categoryLabel = t(`learn.categories.${category}`);

  return (
    <PageLayout
      title={categoryLabel}
      locale={locale}
      breadcrumb={[{ label: t('navigation.learn'), href: '/learn' }, { label: categoryLabel }]}
    >
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

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}

/**
 * Mirrors `LearnCategoryContent` — PageTitle (dynamic category name) +
 * SectionTitle (static) + ListLinkContainer of ListLink rows. PageTitle uses
 * a bar placeholder because the category label is data-driven and not known
 * to the skeleton; section title is static and renders the real string.
 */
async function LearnCategorySkeleton() {
  const locale = await getLocaleFromPathnameHeader();
  const [t, tNav] = await Promise.all([
    getTranslations({ locale, namespace: 'learn' }),
    getTranslations({ locale, namespace: 'navigation' }),
  ]);

  return (
    <div className="space-y-8">
      <PageTitle>
        <span className="inline-block h-7 md:h-8 w-48 bg-muted rounded align-middle animate-pulse" />
      </PageTitle>

      <PagePanel>
        <SectionTitle>{t('articlesTitle')}</SectionTitle>

        {/* ListLinkContainer skeleton */}
        <ul className="bg-card border border-border rounded-md overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="border-b border-border last:border-b-0 px-4 py-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-muted rounded flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-5 bg-muted rounded w-3/4" />
                </div>
              </div>
            </li>
          ))}
        </ul>

        <Divider />

        {/* Breadcrumb: [Home logo] / Learn / <category>. The category label is
            data-driven (per-route i18n key not known to this skeleton) — bar
            placeholder. Mirrors `learn/[category]/page.tsx`'s Breadcrumb. */}
        <nav aria-label="Breadcrumb" className="mb-4 flex min-h-10 items-end">
          <ol className="flex flex-wrap items-center gap-x-1 text-sm">
            <li>
              <div className="w-6 h-6 rounded-sm bg-muted animate-pulse" />
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-muted-foreground">{tNav('learn')}</span>
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </li>
          </ol>
        </nav>
      </PagePanel>
    </div>
  );
}

/**
 * Deliberately NOT a segment-level `loading.tsx` — see the matching comment
 * on `learn/page.tsx` for the full rationale. A file-based `loading.tsx`
 * here would also wrap the deeper `[slug]` article route, causing a
 * double-skeleton flash on direct navigation into a specific article.
 */
export default function LearnCategoryPage({ params }: Props) {
  return (
    <Suspense fallback={<LearnCategorySkeleton />}>
      <LearnCategoryContent params={params} />
    </Suspense>
  );
}
