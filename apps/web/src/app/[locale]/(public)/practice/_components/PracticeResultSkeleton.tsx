'use client';

import { useAuth } from '@/app/[locale]/_contexts/AuthContext';

import { PracticeResultPanelSkeleton } from './PracticeResultPanelSkeleton';

type Props = {
  /**
   * Whether this module awards EXP on completion. When true, the EXP card is
   * reserved for authenticated users (who will land on it). Defaults to false
   * so unconfigured callers keep the previous no-reservation behavior.
   */
  grantsExp?: boolean;
  /**
   * Whether this module shows the sign-up banner. When true, the banner is
   * reserved for anonymous users. Defaults to false for the same reason.
   */
  showsSignUpBanner?: boolean;
};

/**
 * Inline practice-result fallback used by client-side session components
 * (e.g. `CoordinateQuizChallenge`, `LegalMovesSession`, `FenSession`) while a
 * finished run is being saved and the redirect to the result route is in
 * flight. For an authenticated run this window spans the whole `saveResult()`
 * round-trip, so the placeholder is on screen long enough to be noticed.
 *
 * It renders the SAME inner content as the result route's server `loading.tsx`
 * (both share `PracticeResultPanelSkeleton`), minus the chrome: the session
 * page's `<PageTitle>` / `<PagePanel>` / `<Breadcrumb>` are already in the DOM
 * at this point, so re-emitting them would double-render. The shared inner
 * shape means the session → result-route-loading → result sequence keeps one
 * stable panel layout instead of jumping from a tiny score placeholder to the
 * full result and shifting twice.
 *
 * The EXP card (authenticated) and sign-up banner (anonymous) are mutually
 * exclusive by auth state; the caller declares via `grantsExp` /
 * `showsSignUpBanner` which the module actually renders, and this component
 * reserves the matching one for the current user.
 *
 * The wrapping `space-y-8` mirrors `PagePanel`'s own child rhythm so the blocks
 * are spaced identically to the real page.
 */
export function PracticeResultSkeleton({
  grantsExp = false,
  showsSignUpBanner = false,
}: Props = {}) {
  const { user, isLoading } = useAuth();
  // While auth is still resolving, reserve neither — the window is brief and
  // guessing wrong would itself shift.
  const authed = !isLoading && !!user;
  const anon = !isLoading && !user;

  return (
    <div className="space-y-8">
      <PracticeResultPanelSkeleton
        reserveExp={grantsExp && authed}
        reserveSignUpBanner={showsSignUpBanner && anon}
      />
    </div>
  );
}
