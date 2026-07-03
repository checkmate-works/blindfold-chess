import { getLocale, getTranslations } from 'next-intl/server';

import { PageLayout } from '@/app/[locale]/_components';

import { ResultSkeleton } from './_components/ResultSkeleton';

/**
 * Route-transition loading UI for the result page.
 *
 * `games/play/page.tsx` deliberately does NOT ship a segment-level
 * `loading.tsx` of its own (it uses a component-level `<Suspense>` inside
 * the page instead) — a `loading.tsx` at `games/play/` would wrap this
 * whole subtree, including this `result/` segment, in an extra `<Suspense>`
 * boundary that fires before this one on a direct navigation, producing a
 * two-stage flash (game skeleton → result skeleton). See the comment on
 * `PlayPage` in `../page.tsx` for the full rationale. This file is safe to
 * keep as a normal `loading.tsx` because nothing is nested deeper than it.
 * Mirrors `page.tsx`'s PageLayout chrome so the title/panel don't shift on
 * handoff.
 */
export default async function ResultLoading() {
  // `loading.tsx` can't receive `params`, and the bare `getTranslations()`
  // resolves against the locale set by `setRequestLocale` — which hasn't run
  // yet while the page is still suspended, so it falls back to the default
  // locale and renders the title in English on a `ja` page. Resolve the
  // request locale explicitly so the skeleton's static text is localized from
  // the first paint.
  const locale = await getLocale();
  const tPlay = await getTranslations({ locale, namespace: 'play' });

  return (
    <PageLayout title={tPlay('resultTitle')} locale={locale}>
      <ResultSkeleton />
    </PageLayout>
  );
}
