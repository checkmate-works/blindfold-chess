import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
// Renamed to avoid conflict with Next.js route segment config `export const dynamic`
import nextDynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV, SUPPORTED_LOCALES } from '@/config';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { MANUAL_ARTICLE_SLUGS } from '../_lib/types';
import { getManualArticle, getManualArticleAvailableLocales } from '../_lib/utils';

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

export function generateStaticParams(): { locale: Locale; slug: string }[] {
  const slugs = Object.values(MANUAL_ARTICLE_SLUGS);
  return SUPPORTED_LOCALES.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const article = await getManualArticle(slug, locale);

  if (!article) {
    const t = await getTranslations({ locale, namespace: 'manual' });
    return {
      title: t('articleNotFound'),
    };
  }

  const title = article.metadata.title;
  const description = article.metadata.excerpt;
  const availableLocales = getManualArticleAvailableLocales(slug);

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `manual/${slug}`,
      title,
      description,
      availableLocales,
    }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function ManualArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const article = await getManualArticle(slug, locale);
  const t = await getTranslations({ locale, namespace: 'manual' });

  if (!article) {
    notFound();
  }

  const title = article.metadata.title;

  return (
    <div className="space-y-8">
      <PageTitle>{article.metadata.title}</PageTitle>

      <PagePanel>
        <article className="prose prose-slate dark:prose-invert max-w-none">
          <MarkdownRenderer content={article.content} skipFirstH1={true} />
        </article>

        {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
        )}

        <Divider />

        <Breadcrumb
          items={[{ label: t('title'), href: '/manual' }, { label: title }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
