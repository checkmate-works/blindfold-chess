import { getTranslations } from 'next-intl/server';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';

/**
 * Rank detail page loading skeleton.
 *
 * Mirrors the structure of `[slug]/page.tsx` (RankHeader → Criteria →
 * Tips card → Score Requirements → Breadcrumb) so the layout shifts
 * minimally when the real content streams in. Without this file Next.js
 * falls back to the parent `ranks/loading.tsx`, which is shaped for the
 * 7-card list page and looks wildly different from a single-rank detail.
 *
 * The rank name is unknown at loading time (no access to `params`), so the
 * page title and breadcrumb tail render as bar placeholders. Static section
 * titles (`Criteria`, `Score Requirements`) and the `Ranks` parent crumb
 * resolve from the `ranks` namespace and stay textual.
 */
export default async function RankDetailLoading() {
  const t = await getTranslations('ranks');

  return (
    <div className="space-y-8">
      <PageTitle>
        <span className="inline-block h-7 w-32 rounded bg-muted align-middle animate-pulse" />
      </PageTitle>

      <PagePanel>
        {/* RankHeader skeleton: belt color bar + rounded badge + h2 placeholder */}
        <div className="-mx-4 -mt-4 mb-6 h-2 sm:-mx-6 sm:-mt-6 bg-muted animate-pulse" />
        <div className="flex items-center gap-3">
          <span className="inline-block size-5 shrink-0 rounded-full bg-muted animate-pulse" />
          <div className="h-7 w-40 rounded bg-muted animate-pulse" />
        </div>

        {/* Criteria section */}
        <SectionTitle>{t('detail.criteria')}</SectionTitle>
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-muted animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
        </div>

        {/* Tips callout card — included because most ranks (mukyu/5kyu/4kyu/3kyu)
            render one. Higher ranks without a guide will absorb a small CLS jump. */}
        <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-950/20">
          <div className="mb-2 h-5 w-24 rounded bg-amber-200/60 animate-pulse dark:bg-amber-800/40" />
          <div className="mb-1 h-4 w-full rounded bg-amber-200/60 animate-pulse dark:bg-amber-800/40" />
          <div className="mb-3 h-4 w-3/4 rounded bg-amber-200/60 animate-pulse dark:bg-amber-800/40" />
          <div className="mx-auto h-40 max-w-[10rem] rounded bg-amber-200/60 animate-pulse dark:bg-amber-800/40" />
          <div className="mx-auto mt-2 h-4 w-32 rounded bg-amber-200/60 animate-pulse dark:bg-amber-800/40" />
        </div>

        {/* Score requirements */}
        <SectionTitle>{t('detail.requirements')}</SectionTitle>
        <ul className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="rounded-lg border border-border bg-card px-4 py-3 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="size-5 shrink-0 rounded bg-muted" />
                <div className="h-4 flex-1 rounded bg-muted" />
                <div className="size-5 shrink-0 rounded bg-muted" />
              </div>
            </li>
          ))}
        </ul>

        {/* Breadcrumb (compact) — mirrors PageLayout's trailing breadcrumb block.
            Home logo and the rank-name tail are placeholders; the `Ranks` middle
            crumb is static and resolves from i18n. */}
        <div className="!mt-4 space-y-4">
          <Divider />
          <nav aria-label="Breadcrumb" className="flex min-h-6 items-center">
            <ol className="flex flex-wrap items-center gap-x-1 text-sm">
              <li>
                <div className="size-6 rounded-sm bg-muted animate-pulse" />
              </li>
              <li className="flex items-center">
                <span className="mx-1 text-muted-foreground">/</span>
                <span className="text-muted-foreground">{t('pageTitle')}</span>
              </li>
              <li className="flex items-center">
                <span className="mx-1 text-muted-foreground">/</span>
                <div className="h-4 w-20 rounded bg-muted animate-pulse" />
              </li>
            </ol>
          </nav>
        </div>
      </PagePanel>
    </div>
  );
}
