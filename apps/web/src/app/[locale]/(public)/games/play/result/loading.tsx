import { getLocale, getTranslations } from 'next-intl/server';

import { PageLayout } from '@/app/[locale]/_components';

import { ResultSkeleton } from './_components/ResultSkeleton';

/**
 * Route-transition loading UI for the result page.
 *
 * Without this file, navigating into `games/play/result` inherits the parent
 * `games/play/loading.tsx` (the in-game board skeleton), producing a jarring
 * two-stage flash: game skeleton → result skeleton. Declaring the result
 * segment's own `loading.tsx` shows the result skeleton from the first paint
 * of the transition instead. Mirrors `page.tsx`'s PageLayout chrome so the
 * title/panel don't shift on handoff.
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
