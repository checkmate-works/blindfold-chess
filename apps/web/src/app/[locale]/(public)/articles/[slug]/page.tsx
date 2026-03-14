import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';

import { JsonLd, generateBlogPostingSchema } from '@/lib/jsonld';

import {
  Breadcrumb,
  Divider,
  MarkdownRenderer,
  PagePanel,
  PageTitle,
} from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getPublishedArticle, getPublishedArticles } from '../_lib/queries';

type Props = {
  params: Promise<{
    locale: Locale;
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const articles = await getPublishedArticles();
  const slugs = [...new Set(articles.map((a) => a.slug))];

  return SUPPORTED_LOCALES.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await getPublishedArticle(slug, locale);

  if (!article) {
    return {
      title: 'Article Not Found',
    };
  }

  return {
    ...generateCanonicalMetadata({ locale, path: `articles/${slug}` }),
    title: article.title,
  };
}

export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  const article = await getPublishedArticle(slug, locale);
  const t = await getTranslations({ locale, namespace: 'articles' });

  if (!article) {
    notFound();
  }

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : undefined;

  return (
    <div className="space-y-12">
      <JsonLd
        data={generateBlogPostingSchema({
          title: article.title,
          description: article.content.slice(0, 160),
          slug: article.slug,
          publishedAt: article.publishedAt,
          locale,
        })}
      />

      <header>
        <PageTitle>{article.title}</PageTitle>
      </header>

      <PagePanel>
        <article className="prose prose-slate dark:prose-invert max-w-none">
          <MarkdownRenderer content={article.content} skipFirstH1={true} />
        </article>

        {publishedDate && (
          <p className="text-sm text-muted-foreground text-right">{publishedDate}</p>
        )}

        <Divider />

        <Breadcrumb
          items={[{ label: t('pageTitle'), href: '/articles' }, { label: article.title }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
