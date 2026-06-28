import { PracticeResultPanelSkeleton } from './PracticeResultPanelSkeleton';

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
 * The wrapping `space-y-8` mirrors `PagePanel`'s own child rhythm so the blocks
 * are spaced identically to the real page.
 */
export function PracticeResultSkeleton() {
  return (
    <div className="space-y-8">
      <PracticeResultPanelSkeleton />
    </div>
  );
}
