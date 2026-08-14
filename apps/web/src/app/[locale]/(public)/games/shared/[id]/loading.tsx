import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

import { ResultSkeleton } from '@/app/[locale]/(public)/games/play/result/_components/ResultSkeleton';
import { PageLayout } from '@/app/[locale]/_components';
import { Skeleton } from '@/app/[locale]/_components/Skeleton';

/**
 * Route-transition loading UI for the shared-game detail.
 *
 * The route is `force-dynamic` and its data path is two DB waves deep, so
 * without a boundary a `<Link>` click holds the previous page frozen for the
 * whole fetch — the same dead-click problem `/u/[username]/loading.tsx`
 * documents. The body reuses {@link ResultSkeleton}: the result screen and
 * this page render the same `GameReview` layout, so the skeleton mirrors
 * both. The title is a bar placeholder (the game's title is part of what is
 * being fetched), unlike result/loading.tsx whose title is a static string.
 *
 * Locale is read via {@link getLocaleFromPathnameHeader} — permitted here
 * because the route is dynamic regardless; see that helper's TSDoc before
 * copying this into a static route's boundary.
 *
 * The `edit/` child segment has no boundary of its own and inherits this
 * one; its form layout differs from the board skeleton, but a brief generic
 * skeleton beats a frozen page for that owner-only surface.
 */
export default async function SharedGameLoading() {
  const locale = await getLocaleFromPathnameHeader();

  return (
    <PageLayout title={<Skeleton className="mx-auto h-8 w-56 rounded-md" />} locale={locale}>
      <ResultSkeleton />
    </PageLayout>
  );
}
