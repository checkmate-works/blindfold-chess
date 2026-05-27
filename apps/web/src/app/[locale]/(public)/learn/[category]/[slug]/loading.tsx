import { getTranslations } from 'next-intl/server';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';

/**
 * Learn article detail loading skeleton.
 *
 * Mirrors `learn/[category]/[slug]/page.tsx`: PageTitle (dynamic article
 * title) + PagePanel containing a Markdown article body, related-practice
 * cards, related-articles cards, and category browser. Section titles
 * (`practiceYourSkills`, `relatedArticles`, `browseByCategory`) are static
 * and render real strings; article body and dynamic card contents are bar
 * placeholders.
 *
 * Replaces the inherited `learn/loading.tsx` (which reserved a single card
 * grid sized for the index page).
 */
export default async function LearnArticleLoading() {
  const [t, tNav] = await Promise.all([getTranslations('learn'), getTranslations('navigation')]);

  return (
    <div className="space-y-8">
      <PageTitle>
        <span className="inline-block h-7 md:h-8 w-2/3 bg-muted rounded align-middle animate-pulse" />
      </PageTitle>

      <PagePanel>
        {/* Article body — multi-paragraph Markdown placeholder */}
        <article className="prose prose-slate dark:prose-invert max-w-none animate-pulse">
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-11/12" />
            <div className="h-4 bg-muted rounded w-10/12" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-9/12" />
          </div>

          <div className="mt-6 space-y-3">
            <div className="h-5 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-11/12" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>

          <div className="mt-6 space-y-3">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-10/12" />
            <div className="h-4 bg-muted rounded w-4/5" />
          </div>
        </article>

        {/* Related practice (conditional in real page; reserve to avoid CLS
            for the common "has related practice" case) */}
        <div className="space-y-4">
          <SectionTitle>{t('practiceYourSkills')}</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-6 bg-card rounded-md border border-border animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 bg-muted rounded flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-5 bg-muted rounded w-1/2 mb-2" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Related articles (conditional in real page; same rationale) */}
        <div className="space-y-4">
          <SectionTitle>{t('relatedArticles')}</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-6 bg-card rounded-md border border-border animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 bg-muted rounded flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-5 bg-muted rounded w-1/2 mb-2" />
                    <div className="h-4 bg-muted rounded w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category browser (always rendered) */}
        <div className="space-y-4">
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
        </div>

        <Divider />

        {/* Breadcrumb: [Home logo] / Learn / <category> / <article title>.
            The category and article title are data-driven — bar placeholders.
            Mirrors `learn/[category]/[slug]/page.tsx`'s Breadcrumb. */}
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
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <div className="h-4 w-40 bg-muted rounded animate-pulse" />
            </li>
          </ol>
        </nav>
      </PagePanel>
    </div>
  );
}
