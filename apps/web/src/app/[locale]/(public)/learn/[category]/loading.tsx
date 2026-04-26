import { getTranslations } from 'next-intl/server';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';

/**
 * Learn category loading skeleton.
 *
 * Mirrors `learn/[category]/page.tsx` — PageTitle (dynamic category name) +
 * SectionTitle (static) + ListLinkContainer of ListLink rows. PageTitle uses
 * a bar placeholder because the category label is data-driven and not known
 * to the skeleton; section title is static and renders the real string.
 *
 * Replaces the inherited `learn/loading.tsx` (which reserved a card grid for
 * the index page, not a list-row layout).
 */
export default async function LearnCategoryLoading() {
  const [t, tNav] = await Promise.all([getTranslations('learn'), getTranslations('navigation')]);

  return (
    <div className="space-y-8">
      <PageTitle>
        <span className="inline-block h-7 md:h-8 w-48 bg-muted rounded align-middle animate-pulse" />
      </PageTitle>

      <PagePanel>
        <SectionTitle>{t('articlesTitle')}</SectionTitle>

        {/* ListLinkContainer skeleton */}
        <ul className="bg-card border border-border rounded-md overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="border-b border-border last:border-b-0 px-4 py-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-muted rounded flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-5 bg-muted rounded w-3/4" />
                </div>
              </div>
            </li>
          ))}
        </ul>

        <Divider />

        {/* Breadcrumb: [Home logo] / Learn / <category>. The category label is
            data-driven (per-route i18n key not known to this skeleton) — bar
            placeholder. Mirrors `learn/[category]/page.tsx`'s Breadcrumb. */}
        <nav aria-label="Breadcrumb" className="mb-4 flex min-h-10 items-end">
          <ol className="flex flex-wrap items-center gap-x-1 text-sm">
            <li>
              <div className="w-6 h-6 rounded-sm bg-muted animate-pulse" />
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-muted-foreground">{tNav('learn')}</span>
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </li>
          </ol>
        </nav>
      </PagePanel>
    </div>
  );
}
