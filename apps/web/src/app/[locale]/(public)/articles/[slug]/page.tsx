import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
// Renamed to avoid conflict with Next.js route segment config `export const dynamic`
import nextDynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

import type { TiptapJsonContent } from '@/app/admin/articles/_lib/types';
import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';

import { JsonLd, generateBlogPostingSchema } from '@/lib/seo/jsonld';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { TiptapRenderer } from '@/app/[locale]/_components/TiptapRenderer';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getPublishedArticle } from '../_lib/queries';

export const revalidate = 300;

const MarkdownRenderer = nextDynamic(
  () =>
    import('@/app/_components/MarkdownRenderer').then((m) => ({
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
  const result = await getPublishedArticle(slug, locale);

  if (!result) {
    const t = await getTranslations({ locale, namespace: 'articles' });
    return {
      title: resolveTitle(t('articleNotFound'), locale),
    };
  }

  const { article, availableLocales } = result;
  const isFallback = article.locale !== locale;
  const title = article.title;
  const description = article.content.slice(0, 160).replace(/\n/g, ' ').trim();

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `articles/${slug}`,
      title,
      description,
      availableLocales,
      ...(isFallback && {
        canonicalLocale: article.locale,
      }),
    }),
    title: resolveTitle(title, isFallback ? article.locale : locale),
    description,
  };
}

export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  const result = await getPublishedArticle(slug, locale);
  const t = await getTranslations({ locale, namespace: 'articles' });

  if (!result) {
    notFound();
  }

  const { article } = result;
  const isFallback = article.locale !== locale;

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : undefined;

  return (
    <div className="space-y-8">
      <JsonLd
        data={generateBlogPostingSchema({
          title: article.title,
          description: article.content.slice(0, 160),
          slug: article.slug,
          publishedAt: article.publishedAt,
          locale,
        })}
      />

      <PageTitle>{article.title}</PageTitle>

      <PagePanel>
        {isFallback && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            {t('notTranslatedNotice')}
          </div>
        )}
        <article className="prose prose-slate dark:prose-invert max-w-none">
          {article.contentFormat === 'tiptap_json' && article.contentJson ? (
            <TiptapRenderer content={article.contentJson as TiptapJsonContent} />
          ) : (
            <MarkdownRenderer content={article.content} skipFirstH1={true} />
          )}
        </article>

        {publishedDate && (
          <p className="text-sm text-muted-foreground text-right">{publishedDate}</p>
        )}

        {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
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
