import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
// Renamed to avoid conflict with Next.js route segment config `export const dynamic`
import nextDynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

import type { TiptapJsonContent } from '@/app/admin/articles/_lib/types';
import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV, SUPPORTED_LOCALES } from '@/config';
import { routing } from '@/i18n/routing';

import { JsonLd, generateBlogPostingSchema } from '@/lib/seo/jsonld';

import { PageLayout } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { TiptapRenderer } from '@/app/[locale]/_components/TiptapRenderer';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getPublishedArticle, getPublishedArticles } from '../_lib/queries';

export const revalidate = 1800;

/**
 * Pre-render every published (locale × slug) at build time so popular bot
 * traffic hits the static cache instead of triggering on-demand ISR Writes.
 * `dynamicParams` is left at its default `true` so articles published after
 * the build still render on first visit.
 */
export async function generateStaticParams(): Promise<{ locale: Locale; slug: string }[]> {
  const published = await getPublishedArticles();
  const uniqueSlugs = [...new Set(published.map((a) => a.slug))];
  return SUPPORTED_LOCALES.flatMap((locale) => uniqueSlugs.map((slug) => ({ locale, slug })));
}

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
  // Narrow DB-sourced `locale` values (typed as plain `string`) to the
  // `Locale` union before handing them to the exhaustive metadata helpers.
  // Unknown values are filtered out of `availableLocales` (rather than
  // falling back silently) so the hreflang set never advertises an
  // unsupported locale.
  const narrowedAvailableLocales = availableLocales.filter((l): l is Locale =>
    hasLocale(routing.locales, l)
  );
  const articleLocale: Locale | undefined = hasLocale(routing.locales, article.locale)
    ? article.locale
    : undefined;
  const isFallback = articleLocale !== locale;
  const title = article.title;
  const description = article.content.slice(0, 160).replace(/\n/g, ' ').trim();

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `articles/${slug}`,
      title,
      description,
      availableLocales: narrowedAvailableLocales,
      ...(isFallback &&
        articleLocale && {
          canonicalLocale: articleLocale,
        }),
    }),
    title: resolveTitle(title, isFallback && articleLocale ? articleLocale : locale),
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
    <>
      <JsonLd
        data={generateBlogPostingSchema({
          title: article.title,
          description: article.content.slice(0, 160),
          slug: article.slug,
          publishedAt: article.publishedAt,
          locale,
        })}
      />

      <PageLayout
        title={article.title}
        locale={locale}
        breadcrumb={[{ label: t('pageTitle'), href: '/articles' }, { label: article.title }]}
      >
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
      </PageLayout>
    </>
  );
}
