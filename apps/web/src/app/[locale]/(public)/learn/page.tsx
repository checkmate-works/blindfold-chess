import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getLocale, setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';

import {
  CardLink,
  Divider,
  PageLayout,
  PagePanel,
  PageTitle,
  SectionTitle,
} from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { CATEGORY_STYLES } from './_lib/types';
import { getAvailableCategories, getCategoryCounts } from './_lib/utils';

export const generateStaticParams = generateLocaleStaticParams;

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'metadata.learn', path: 'learn' });
}

async function LearnContent({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const categoryCounts = await getCategoryCounts(locale);
  const availableCategories = getAvailableCategories();

  const categoryInfos = availableCategories.map((cat) => ({
    category: cat,
    label: t(`learn.categories.${cat}`),
    count: categoryCounts[cat],
    countLabel: t('learn.articleCount', { count: categoryCounts[cat] }),
  }));

  return (
    <PageLayout
      title={t('learn.title')}
      locale={locale}
      breadcrumb={[{ label: t('navigation.learn') }]}
    >
      <SectionTitle>{t('learn.browseByCategory')}</SectionTitle>

      <div className="space-y-4">
        {categoryInfos.map((info) => {
          const style = CATEGORY_STYLES[info.category];
          // Determine description - for now using a generic one or looking up if exists
          // Since existing code didn't have detailed description per category in utils, we construct it.
          // Accessing style.icon directly for icon.

          return (
            <CardLink
              key={info.category}
              href={`/learn/${info.category}`}
              icon={style.icon}
              title={info.label}
              description={t('learn.articleCount', { count: info.count })}
              locale={locale}
            />
          );
        })}
      </div>

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}
    </PageLayout>
  );
}

/**
 * Mirrors `LearnContent` (PageTitle + PagePanel + SectionTitle + 5 CardLink
 * placeholders matching the available-categories grid) to minimise CLS.
 * Static labels resolve from the `learn` namespace; per-category counts
 * (DB-driven) stay as bar placeholders.
 *
 * Note: `[category]` and `[category]/[slug]` ship their own skeletons
 * because their bodies diverge from this index shape (ListLink rows and a
 * Markdown article body respectively).
 */
async function LearnSkeleton() {
  const locale = await getLocale();
  const [t, tNav] = await Promise.all([
    getTranslations({ locale, namespace: 'learn' }),
    getTranslations({ locale, namespace: 'navigation' }),
  ]);

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('browseByCategory')}</SectionTitle>

        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-6 bg-card rounded-md border border-border animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 bg-muted rounded flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-5 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Divider />

        {/* Breadcrumb: [Home logo] / Learn. Single static crumb mirrors
            `learn/page.tsx`'s `<Breadcrumb items={[{ label: t('navigation.learn') }]} />`. */}
        <nav aria-label="Breadcrumb" className="mb-4 flex min-h-10 items-end">
          <ol className="flex flex-wrap items-center gap-x-1 text-sm">
            <li>
              <div className="w-6 h-6 rounded-sm bg-muted animate-pulse" />
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-foreground font-medium">{tNav('learn')}</span>
            </li>
          </ol>
        </nav>
      </PagePanel>
    </div>
  );
}

/**
 * Deliberately NOT a segment-level `loading.tsx`. A `loading.tsx` file here
 * would wrap this whole subtree (including `/learn/[category]/[slug]` two
 * levels down) in a `<Suspense>` boundary, so navigating straight into a
 * specific article (e.g. from the many `/learn/{category}/{slug}` deep
 * links scattered across practice pages) would flash this category-grid
 * skeleton before the article page's own skeleton mounted. Scoping the
 * boundary inside this page's own JSX means it only exists in the render
 * tree when this exact route is the matched leaf.
 */
export default function LearnPage({ params }: Props) {
  return (
    <Suspense fallback={<LearnSkeleton />}>
      <LearnContent params={params} />
    </Suspense>
  );
}
