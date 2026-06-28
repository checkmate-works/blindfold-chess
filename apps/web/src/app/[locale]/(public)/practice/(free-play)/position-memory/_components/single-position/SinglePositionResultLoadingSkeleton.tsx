import { getLocale, getTranslations } from 'next-intl/server';

import { BoardSkeleton } from '@/app/_components';

import { Divider, PagePanel, SectionTitle } from '@/app/[locale]/_components';

/**
 * Position-memory single-position result loading skeleton.
 *
 * Tailored to `SinglePositionResult`, which renders directly into `<PagePanel>`
 * WITHOUT a `<PageTitle>`. The shared `PracticeResultLoadingSkeleton` cannot be
 * reused here because it reserves a 50px PageTitle band that disappears on swap
 * → strictly worse than no skeleton.
 *
 * Used both as the route `loading.tsx` (re-exported by the `[id]` and custom
 * `[token]` result routes) and as those pages' inner `<Suspense>` fallback (the
 * `SinglePositionResult` client component owns the `<PagePanel>` chrome, so
 * while its chunk loads on a soft navigation the panel would otherwise drop to
 * bare background). Sharing one skeleton keeps the shape continuous from the
 * route loading state through to first paint.
 *
 * Mirrored sections (in render order):
 *   - SectionTitle "Result"                                  — static i18n
 *   - Accuracy h2                                            — dynamic % → bar
 *   - SegmentedProgressBar                                   — conditional, reserved
 *   - Board comparison (2 boards: Original + Your Recreation) — labels static, boards `<BoardSkeleton>`
 *   - ExpGainDisplay                                         — conditional, reserved
 *   - 2 action buttons (Try Again / Back to List)            — labels static
 *   - "Required Knowledge" SectionTitle + 2 CardLink         — labels static, card titles dynamic
 *   - Divider + Breadcrumb (Home / Practice / Position Memory / <bar> / Result)
 *
 * The third breadcrumb crumb is a bar placeholder: it is the position title for
 * `[id]` and the static "custom" label for `[token]`, but both reserve one
 * slot, so a single bar tracks either shape closely enough.
 */
export async function SinglePositionResultLoadingSkeleton() {
  // `loading.tsx` can't receive `params`, and the bare `getTranslations()`
  // resolves against the locale set by `setRequestLocale` — which hasn't run
  // yet while the page is still suspended, so it falls back to the default
  // locale and renders the static text in English on a `ja` page. Resolve the
  // request locale explicitly so the skeleton's text is localized from the
  // first paint.
  const locale = await getLocale();
  const [t, tNav] = await Promise.all([
    getTranslations({ locale, namespace: 'practice.positionMemory' }),
    getTranslations({ locale, namespace: 'navigation' }),
  ]);

  return (
    <div className="space-y-8">
      <PagePanel>
        <div className="space-y-6">
          <SectionTitle>{t('result')}</SectionTitle>

          {/* Accuracy h2 — dynamic percentage uses a bar; reserve the same
              h-8 visual rhythm as the rendered `text-2xl font-bold`. */}
          <div className="flex justify-center">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          </div>

          {/* SegmentedProgressBar — conditional in real page (only when
              accuracy && !isSkipped). Reserved to avoid worse CLS when the
              non-skipped case (the common one) renders. */}
          <div>
            <div className="h-4 w-40 bg-muted rounded mb-2 animate-pulse" />
            <div className="h-3 w-full bg-muted rounded-full animate-pulse" />
          </div>

          {/* Board comparison: Original | Your Recreation. Labels are static
              i18n; boards use `BoardSkeleton`. Same `grid-cols-1
              md:grid-cols-2 gap-4` + `max-w-xs mx-auto` per board as the
              rendered page. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">{t('original')}</p>
              <div className="w-full max-w-xs mx-auto">
                <BoardSkeleton />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {t('yourRecreation')}
              </p>
              <div className="w-full max-w-xs mx-auto">
                <BoardSkeleton />
              </div>
            </div>
          </div>

          {/* ExpGainDisplay — conditional (logged-in + grant param). Reserve
              a small bar to avoid CLS for the authenticated path. */}
          <div className="h-6 w-32 mx-auto bg-muted rounded animate-pulse" />

          {/* Action buttons (Try Again / Back to List) — full-width primary
              + secondary, matching the real `space-y-3` block. */}
          <div className="space-y-3">
            <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
            <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
          </div>

          {/* Required Knowledge — SectionTitle is static; 2 CardLink
              placeholders match the real `grid-cols-1 sm:grid-cols-2 gap-4`. */}
          <div className="mt-8 space-y-4">
            <SectionTitle>{t('requiredKnowledge')}</SectionTitle>
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
        </div>

        <Divider />

        {/* Breadcrumb: [Home logo] / Practice / Position Memory / <bar> /
            Result. Three static crumbs plus one variable crumb (position title
            for `[id]`, "custom" label for `[token]`) rendered as a bar. */}
        <nav aria-label="Breadcrumb" className="mb-4 flex min-h-10 items-end">
          <ol className="flex flex-wrap items-center gap-x-1 text-sm">
            <li>
              <div className="w-6 h-6 rounded-sm bg-muted animate-pulse" />
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-muted-foreground">{tNav('practice')}</span>
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-muted-foreground">{t('list.title')}</span>
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-foreground font-medium">{t('result')}</span>
            </li>
          </ol>
        </nav>
      </PagePanel>
    </div>
  );
}
