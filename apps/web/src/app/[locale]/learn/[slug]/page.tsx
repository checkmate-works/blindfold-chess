import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import {
  Breadcrumb,
  CardLink,
  Divider,
  MarkdownRenderer,
  PageTitle,
  SectionTitle,
} from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import {
  getPracticeModuleIcon,
  getPracticeModuleTranslationKey,
} from '@/app/[locale]/_lib/practice-modules';
import type { Locale } from '@/app/[locale]/_lib/types';

import { CategoryIndex } from '../_components';
import { ARTICLE_ICONS, type ArticleSlug } from '../_lib/types';
import {
  getArticle,
  getArticlesByCategory,
  getAvailableArticles,
  getAvailableCategories,
  getCategoryCounts,
  getPracticeModulesForArticle,
} from '../_lib/utils';

export const dynamic = 'force-static';

type Props = {
  params: Promise<{
    locale: Locale;
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const slugs = getAvailableArticles();
  const locales = ['en', 'ja'] as const;

  return slugs.flatMap((slug) =>
    locales.map((locale) => ({
      locale,
      slug,
    }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await getArticle(slug, locale);

  if (!article) {
    return {
      title: 'Article Not Found',
    };
  }

  return {
    ...generateCanonicalMetadata({ locale, path: `learn/${slug}` }),
    title: article.metadata.title,
    description: article.metadata.excerpt,
  };
}

export default async function LearnArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  const article = await getArticle(slug, locale);
  const t = await getTranslations({ locale });

  if (!article) {
    notFound();
  }

  const relatedPracticeModules = getPracticeModulesForArticle(slug as ArticleSlug);

  // Get related articles from the same category
  const category = article.metadata.category;
  const relatedArticles = category
    ? (await getArticlesByCategory(category, locale)).filter((a) => a.slug !== slug)
    : [];

  // Get category data for CategoryIndex
  const categoryCounts = await getCategoryCounts(locale);
  const availableCategories = getAvailableCategories();
  const categoryInfos = availableCategories.map((cat) => ({
    category: cat,
    label: t(`learn.categories.${cat}`),
    count: categoryCounts[cat],
    countLabel: t('learn.articleCount', { count: categoryCounts[cat] }),
  }));

  return (
    <div className="space-y-12">
      {/* Article header */}
      <header className="space-y-4 max-w-3xl">
        <PageTitle>{article.metadata.title}</PageTitle>
        {article.metadata.excerpt && (
          <p className="text-lg text-muted-foreground leading-relaxed">
            {article.metadata.excerpt}
          </p>
        )}
      </header>

      {/* Article content with narrower width for readability */}
      <article className="prose prose-slate dark:prose-invert max-w-2xl">
        <MarkdownRenderer content={article.content} skipFirstH1={true} />
      </article>

      {relatedPracticeModules && (
        <div className="space-y-4">
          <Divider />
          <SectionTitle>{t('learn.practiceYourSkills')}</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {relatedPracticeModules.map((moduleId) => {
              const translationKey = getPracticeModuleTranslationKey(moduleId);
              const icon = getPracticeModuleIcon(moduleId);

              return (
                <CardLink
                  key={moduleId}
                  href={`/practice/${moduleId}`}
                  icon={icon}
                  title={t(`practice.${translationKey}.title`)}
                  description={t(`practice.${translationKey}.description`)}
                  locale={locale}
                />
              );
            })}
          </div>
        </div>
      )}

      {relatedArticles.length > 0 && (
        <div className="space-y-4">
          <Divider />
          <SectionTitle>{t('learn.relatedArticles')}</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {relatedArticles.map((relatedArticle) => (
              <CardLink
                key={relatedArticle.slug}
                href={`/learn/${relatedArticle.slug}`}
                icon={ARTICLE_ICONS[relatedArticle.slug as ArticleSlug] || '📚'}
                title={relatedArticle.title}
                description={relatedArticle.excerpt}
                locale={locale}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <Divider />
        <SectionTitle>{t('learn.browseByCategory')}</SectionTitle>
        <CategoryIndex
          categories={categoryInfos}
          selectedCategory={category}
          locale={locale}
          allLabel={t('learn.allCategories')}
          variant="cards"
        />
      </div>

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.learn'), href: '/learn' },
          { label: article.metadata.title },
        ]}
        locale={locale}
      />
    </div>
  );
}
