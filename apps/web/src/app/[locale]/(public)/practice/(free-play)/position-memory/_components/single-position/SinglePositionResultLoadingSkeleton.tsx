import { getTranslations } from 'next-intl/server';

import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

import { getOptionalUser } from '@/lib/auth';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { Skeleton } from '@/app/[locale]/_components/Skeleton';

import { SinglePositionResultPanelSkeleton } from './SinglePositionResultPanelSkeleton';

type Props = {
  /**
   * Whether this route's runs earn EXP. The `[id]` route does (reserve the EXP
   * card for authenticated users); the custom `[token]` route never does
   * (`expInfo` is always null there), so it passes `false`.
   */
  grantsExp?: boolean;
};

/**
 * Position-memory single-position result loading skeleton.
 *
 * Tailored to `SinglePositionResult` (a `<PageTitle>` above a `<PagePanel>`,
 * with a board-comparison body). The shared `PracticeResultLoadingSkeleton`
 * cannot be reused here because it reserves a leaderboard the page never
 * renders and omits the board comparison.
 *
 * Used as the route `loading.tsx` (re-exported by the `[id]` and custom
 * `[token]` result routes) and as those pages' inner `<Suspense>` fallback. The
 * inner-panel content is shared with `SinglePositionResultSkeleton` (the inline
 * session finish fallback) via `SinglePositionResultPanelSkeleton`, so the
 * session → result-route-loading → result sequence keeps one stable shape.
 *
 * `ExpGainDisplay` (authenticated) and `SignUpBanner` (anonymous) are mutually
 * exclusive by auth state, so the user is resolved here and exactly one is
 * reserved.
 */
export async function SinglePositionResultLoadingSkeleton({ grantsExp = false }: Props = {}) {
  const locale = await getLocaleFromPathnameHeader();
  const [t, tNav, user] = await Promise.all([
    getTranslations({ locale, namespace: 'practice.positionMemory' }),
    getTranslations({ locale, namespace: 'navigation' }),
    getOptionalUser(),
  ]);
  const isAuthed = !!user;

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
        <SinglePositionResultPanelSkeleton
          labels={{
            result: t('result'),
            original: t('original'),
            yourRecreation: t('yourRecreation'),
            requiredKnowledge: t('requiredKnowledge'),
          }}
          reserveExp={grantsExp && isAuthed}
          reserveSignUpBanner={!isAuthed}
        />

        <Divider />

        {/* Breadcrumb: [Home logo] / Practice / Position Memory / <bar> /
            Result. The third crumb (position title for `[id]`, "custom" label
            for `[token]`) is a bar placeholder. */}
        <nav aria-label="Breadcrumb" className="mb-4 flex min-h-10 items-end">
          <ol className="flex flex-wrap items-center gap-x-1 text-sm">
            <li>
              <Skeleton className="w-6 h-6 rounded-sm" />
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
              <Skeleton className="h-4 w-32 rounded" />
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
