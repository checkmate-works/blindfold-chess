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

import type { ArticleSlug } from '../_lib/types';
import { getArticle, getAvailableArticles, getPracticeModulesForArticle } from '../_lib/utils';

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

  return (
    <div className="space-y-8">
      <PageTitle>{article.metadata.title}</PageTitle>

      <article className="prose prose-slate dark:prose-invert max-w-none space-y-4">
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
