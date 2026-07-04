import { getTranslations } from 'next-intl/server';

import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

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
  const locale = await getLocaleFromPathnameHeader();
  const tPlay = await getTranslations({ locale, namespace: 'play' });

  return (
    <PageLayout title={tPlay('resultTitle')} locale={locale}>
      <ResultSkeleton />
    </PageLayout>
  );
}
