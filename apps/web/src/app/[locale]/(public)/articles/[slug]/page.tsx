import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
// Renamed to avoid conflict with Next.js route segment config `export const dynamic`
import nextDynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

import { shouldShowAds } from '@/lib/ad';
import { JsonLd, generateBlogPostingSchema } from '@/lib/jsonld';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { AdBanner } from '@/app/[locale]/_components/AdBanner';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getPublishedArticle } from '../_lib/queries';

export const dynamic = 'force-dynamic';

const MarkdownRenderer = nextDynamic(
  () =>
    import('@/app/[locale]/_components/MarkdownRenderer').then((m) => ({
      default: m.MarkdownRenderer,
    })),
  { ssr: true }
);

type Props = {
  params: Promise<{
    locale: Locale;
    slug: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await getPublishedArticle(slug, locale);

  if (!article) {
    const t = await getTranslations({ locale, namespace: 'articles' });
    return {
      title: t('articleNotFound'),
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

  const showAds = await shouldShowAds();

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

        {showAds && <AdBanner slot="banner-standard" locale={locale} />}

        <Divider />

        <Breadcrumb
          items={[{ label: t('pageTitle'), href: '/articles' }, { label: article.title }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
