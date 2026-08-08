import { getTranslations } from 'next-intl/server';

import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

import { FeedSkeleton } from '@/app/[locale]/(public)/(home)/_components/FeedSkeleton';

import { ProfileShellSkeleton } from './_components/ProfileShellSkeleton';

/**
 * Loading boundary for the public profile and its archives.
 *
 * @design Why this file is what makes the profile feel fast
 * Every page under `/u/[username]` is `force-dynamic`, so a `<Link>` click can
 * paint nothing until the server has resolved the profile, the viewer, and the
 * shell data. Without a boundary React holds the *previous* page on screen for
 * that whole time during the navigation transition — the URL does not even
 * change — which reads as a dead click rather than as loading. Measured at
 * 431ms with the database one 30ms round trip away and 1.05s at 80ms, before
 * counting a cold start; the page's own Suspense around the timeline does not
 * help, because the shell above it is awaited first.
 *
 * This boundary does not make the page faster — it makes the wait visible.
 * The cost itself is round-trip depth in the feed read, addressed separately.
 *
 * @design Scope
 * A `loading.tsx` covers its segment *and* every descendant without one, so
 * this shape is what `/posts`, `/games` and `/problems/*` get too — correct,
 * since all four draw the same shell, and their bodies are card lists that
 * `FeedSkeleton` approximates. The three sub-pages that do NOT use the shell
 * (`/achievements`, `/followers`, `/block`) each override it with their own,
 * or they would flash a tab row they never render.
 *
 * Locale is read via {@link getLocaleFromPathnameHeader} rather than
 * `getLocale()` (which does not see the layout's `setRequestLocale()` seed in
 * a boundary) — permitted because these routes are dynamic regardless. See
 * that helper's TSDoc before copying this into a static route.
 */
export default async function PublicProfileLoading() {
  const locale = await getLocaleFromPathnameHeader();
  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  return (
    <ProfileShellSkeleton title={t('pageTitle')} locale={locale}>
      <div className="mt-4">
        <FeedSkeleton count={3} />
      </div>
    </ProfileShellSkeleton>
  );
}
