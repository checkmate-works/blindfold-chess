import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
// Renamed to avoid conflict with Next.js route segment config `export const dynamic`
import nextDynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { AdBannerGuard } from '@/app/[locale]/_components/AdBanner/AdBannerGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getManualArticle } from '../_lib/utils';

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

export const dynamic = 'force-dynamic';

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

  return {
    ...generateCanonicalMetadata({ locale, path: `manual/${slug}`, title, description }),
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

        <AdBannerGuard slot="banner-standard" />

        <Divider />

        <Breadcrumb
          items={[{ label: t('title'), href: '/manual' }, { label: title }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
