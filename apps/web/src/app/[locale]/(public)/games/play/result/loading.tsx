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
  const [locale, tPlay] = await Promise.all([getLocale(), getTranslations('play')]);

  return (
    <PageLayout title={tPlay('resultTitle')} locale={locale}>
      <ResultSkeleton />
    </PageLayout>
  );
}
