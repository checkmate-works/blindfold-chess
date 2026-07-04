import { getTranslations } from 'next-intl/server';

import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

import { PageTitle } from '@/app/[locale]/_components';

import { FeedSkeleton } from './_components/FeedSkeleton';

/**
 * Home page loading skeleton.
 *
 * Next.js wraps the page in an implicit `<Suspense>` with this component as
 * the fallback. Because `page.tsx` uses `force-dynamic`, the skeleton is shown
 * during server-side data fetching on every navigation (and briefly on full
 * page reloads).
 *
 * This does NOT affect SEO — Googlebot waits for the final HTML, not the
 * Suspense fallback.
 *
 * The skeleton should mirror the layout of the real page (PageTitle + VsAiCard
 * + Feed) to minimise CLS when the actual content replaces it. PageTitle
 * renders the real translated string (static per locale) rather than a bar
 * placeholder, matching the convention in articles/loading.tsx etc. The
 * HelpTourButton "?" icon next to it (always rendered on Home — its `steps`
 * list is non-empty) gets a same-size circular placeholder so that row
 * doesn't shift width once the real button mounts.
 *
 * Locale is read via {@link getLocaleFromPathnameHeader}, NOT `getLocale()` —
 * see that function's TSDoc for why `getLocale()` is unreliable here.
 */
export default async function HomeLoading() {
  const locale = await getLocaleFromPathnameHeader();
  const tHome = await getTranslations({ locale, namespace: 'home' });

  return (
    <>
      <div className="mb-8 flex items-center justify-center gap-2">
        <PageTitle>{tHome('pageTitle')}</PageTitle>
        {/* HelpTourButton placeholder — see file TSDoc */}
        <div className="h-5 w-5 rounded-full bg-muted animate-pulse" aria-hidden="true" />
      </div>

      <div className="space-y-6">
        {/* `-mx-4` assumes the parent locale layout wrapper uses `px-4` at `<sm` (see `[locale]/layout.tsx`); breaks the skeleton out to flush-edge on mobile to match DashboardCard. */}
        <div className="bg-card -mx-4 sm:mx-0 rounded-none sm:rounded-lg border-0 sm:border sm:border-border overflow-hidden">
          {/* VsAiCard skeleton — matches the loading state in VsAiCard.tsx */}
          <div className="p-4 sm:p-6 border-b border-border">
            <div className="animate-pulse">
              {/* Top row: icon + title on left, link placeholder on right */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-muted" />
                  <div className="h-5 w-16 rounded bg-muted" />
                </div>
                <div className="h-4 w-20 rounded bg-muted" />
              </div>
              {/* Recent divider */}
              <div className="flex items-center gap-2 my-2">
                <div className="h-3 w-8 rounded bg-muted" />
                <div className="flex-1 h-px bg-muted" />
              </div>
              {/* Game info row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-muted" />
                  <div className="h-4 w-12 rounded bg-muted" />
                  <div className="h-4 w-14 rounded bg-muted" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-16 rounded-md bg-muted" />
                  <div className="h-8 w-24 rounded-md bg-muted" />
                </div>
              </div>
            </div>
          </div>

          {/* Feed skeleton */}
          <FeedSkeleton count={5} />
        </div>
      </div>
    </>
  );
}
