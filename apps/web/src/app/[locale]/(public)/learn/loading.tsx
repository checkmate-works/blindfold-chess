import { getLocale, getTranslations } from 'next-intl/server';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';

/**
 * Learn index loading skeleton.
 *
 * Mirrors `learn/page.tsx` (PageTitle + PagePanel + SectionTitle + 5 CardLink
 * placeholders matching the available-categories grid). Static labels resolve
 * from the `learn` namespace; per-category counts (DB-driven) stay as bar
 * placeholders.
 *
 * Note: `[category]` and `[category]/[slug]` ship dedicated `loading.tsx`
 * files because their bodies diverge from this index shape (ListLink rows
 * and a Markdown article body respectively).
 */
export default async function LearnLoading() {
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
