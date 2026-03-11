import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';

import { Breadcrumb, Divider, MarkdownRenderer, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getAvailableManualArticles, getManualArticle } from '../_lib/utils';

type Props = {
  params: Promise<{
    locale: Locale;
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const slugs = getAvailableManualArticles();

  return slugs.flatMap((slug) =>
    SUPPORTED_LOCALES.map((locale) => ({
      locale,
      slug,
    }))
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const article = await getManualArticle(slug, locale);

  if (!article) {
    return {
      title: 'Article Not Found',
    };
  }

  const title = article.metadata.title;
  const excerpt = article.metadata.excerpt;

  return {
    ...generateCanonicalMetadata({ locale, path: `manual/${slug}` }),
    title,
    description: excerpt,
  };
}

export default async function ManualArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  const article = await getManualArticle(slug, locale);
  const t = await getTranslations({ locale, namespace: 'manual' });

  if (!article) {
    notFound();
  }

  const title = article.metadata.title;

  return (
    <div className="space-y-12">
      {/* Header */}
      <header>
        <PageTitle>{article.metadata.title}</PageTitle>
      </header>

      {/* Content */}
      <article className="prose prose-slate dark:prose-invert max-w-none">
        <MarkdownRenderer content={article.content} skipFirstH1={true} />
      </article>

      <Divider />

      <Breadcrumb
        items={[{ label: t('title'), href: '/manual' }, { label: title }]}
        locale={locale}
      />
    </div>
  );
}
