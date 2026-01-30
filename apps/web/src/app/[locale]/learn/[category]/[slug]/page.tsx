import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import {
  Breadcrumb,
  CardLink,
  Divider,
  MarkdownRenderer,
  PageDescription,
  PageTitle,
  SectionTitle,
} from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import {
  getPracticeModuleIcon,
  getPracticeModuleTranslationKey,
} from '@/app/[locale]/_lib/practice-modules';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ARTICLE_ICONS, type ArticleSlug, CATEGORY_STYLES } from '../../_lib/types';
import {
  getAllArticles,
  getArticle,
  getArticlesByCategory,
  getAvailableCategories,
  getCategoryCounts,
  getPracticeModulesForArticle,
} from '../../_lib/utils';

export const dynamic = 'force-static';

type Props = {
  params: Promise<{
    locale: Locale;
    slug: string;
    category: string;
  }>;
};

export async function generateStaticParams() {
  const locales = ['en', 'ja'] as const;

  // We can't easily filter by category here without loading all articles,
  // but generateStaticParams is for pre-rendering.
  // Ideally we should know which article belongs to which category.
  // For now, let's fetch all articles to map correct category.

  const allParams = [];

  for (const locale of locales) {
    const articles = await getAllArticles(locale);
    for (const article of articles) {
      if (article.category) {
        allParams.push({
          locale,
          category: article.category,
          slug: article.slug,
        });
      }
    }
  }

  return allParams;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug, category } = await params;
  const article = await getArticle(slug, locale);

  if (!article || (article.metadata.category && article.metadata.category !== category)) {
    return {
      title: 'Article Not Found',
    };
  }

  return {
    ...generateCanonicalMetadata({ locale, path: `learn/${category}/${slug}` }),
    title: article.metadata.title,
    description: article.metadata.excerpt,
  };
}

export default async function LearnArticlePage({ params }: Props) {
  const { locale, slug, category } = await params;
  const article = await getArticle(slug, locale);
  const t = await getTranslations({ locale });

  if (!article || (article.metadata.category && article.metadata.category !== category)) {
    notFound();
  }

  const relatedPracticeModules = getPracticeModulesForArticle(slug as ArticleSlug);

  // Get related articles from the same category
  const articleCategory = article.metadata.category;
  const relatedArticles = articleCategory
    ? (await getArticlesByCategory(articleCategory, locale)).filter((a) => a.slug !== slug)
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
        {article.metadata.excerpt && <PageDescription>{article.metadata.excerpt}</PageDescription>}
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
                href={`/learn/${category}/${relatedArticle.slug}`}
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
        <div className="space-y-4">
          {categoryInfos.map((info) => {
            const style = CATEGORY_STYLES[info.category];
            // Accessing style.icon directly for icon.

            return (
              <CardLink
                key={info.category}
                href={`/learn/${info.category}`}
                icon={style.icon}
                title={info.label}
                description={t('learn.articleCount', { count: info.count })}
                locale={locale}
                className={
                  info.category === articleCategory ? 'border-primary ring-1 ring-primary' : ''
                }
              />
            );
          })}
        </div>
      </div>

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.learn'), href: '/learn' },
          { label: t(`learn.categories.${category}`), href: `/learn/${category}` },
          { label: article.metadata.title },
        ]}
        locale={locale}
      />
    </div>
  );
}
