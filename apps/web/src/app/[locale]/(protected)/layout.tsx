import { Suspense } from 'react';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { ScopedIntlProvider } from '@/app/_layouts/scoped-intl-layout';

import { getOptionalUser } from '@/lib/auth';
import { withReturnPath } from '@/lib/auth-return-path';
import { getCurrentReturnTarget } from '@/lib/current-return-target';
import { isUserBanned } from '@/lib/moderation/ban';

import { resolveLoadingFallback } from './_lib/resolveLoadingFallback';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Auth gate for the whole protected area (mypage).
 *
 * The heavy await (`supabase.auth.getUser()`, a ~1–2s Auth round-trip) lives in
 * the Suspense-wrapped `ProtectedGate`, NOT on this layout, so React reaches the
 * boundary immediately and streams the skeleton while `getUser()` is in flight.
 * If the await were on the layout itself it would run *before* any boundary,
 * leaving the area blank on a hard navigation (e.g. the post-sign-in
 * `window.location` redirect) — `loading.tsx` cannot cover a layout's own await.
 *
 * The only thing this layout awaits is `headers()` (instant, no IO), to read the
 * middleware-set `x-pathname` and choose a route-appropriate fallback. The same
 * fallback also covers the nested `(confirmed)` layout auth + page data fetch,
 * so it stays as one continuous skeleton until the real content is ready.
 *
 * @knownIssue A `redirect()` thrown from an async Server Component *beneath*
 * this `<Suspense>` (e.g. the nested `(confirmed)`/`(provisional)` layouts'
 * profile-based redirect) intermittently throws a client hydration error —
 * "Rendered more hooks than during the previous render" (React error #310),
 * sometimes crashing the page — on a hard navigation that needs that redirect
 * (reliably reproduced right after first-time sign-up, when `(confirmed)`
 * redirects a profile-less user to `/mypage/setup-username`). Confirmed via
 * `next build && next start` that this is a real streaming-SSR/hydration race
 * between the redirect and this Suspense boundary, NOT a dev-mode/HMR
 * artifact. What the 2026-07-04 investigation established:
 *
 * - Reproduced with `next build && next start`, not only `next dev`, which
 *   rules out a Turbopack HMR artifact. Sometimes it only logs to the
 *   console; sometimes it crashes to Next's "This page couldn't load" error
 *   boundary and needs a manual reload.
 * - Does NOT reproduce for a user who already has a profile, or for a direct
 *   hit on the already-correct destination — only when the gate actually
 *   redirects mid-stream.
 * - Does NOT reproduce for this layout's OWN redirects (`!user` → `/sign-in`,
 *   banned → `/banned`), although they are the same shape of conditional
 *   `redirect()` in the same Suspense-wrapped function — so "any redirect in
 *   this Suspense" is not the trigger on its own.
 * - Moving the profile-based redirect decision up into `ProtectedGate` (still
 *   inside the same `<Suspense>`, one level shallower than the nested
 *   layouts) was tried and does NOT fix it — the race is tied to streaming
 *   under this boundary, not to which component throws or how deep it is.
 * - Removing the `<Suspense>` entirely does eliminate it, which confirms the
 *   cause — but the boundary exists to prevent the blank page during the
 *   auth round-trip (see above), so that trades one bug for the other.
 *
 * Do not re-attempt a fix by relocating the `redirect()` within the existing
 * Suspense tree; that is the first thing to try and it is ruled out. A real
 * fix needs a different approach, e.g. resolving the post-sign-in/sign-up
 * destination server-side (in the `signIn` / registration Server Action) so
 * the client's `window.location.href` hard-navigates straight to the correct
 * URL and no redirect-during-streaming ever happens at `/mypage`; or
 * restructuring the gate so this transition renders the setup-username
 * content in place instead of changing the URL. Both are design changes —
 * decide deliberately and test with `next build && next start`.
 */
export default async function ProtectedLayout({ children, params }: Props) {
  const pathname = (await headers()).get('x-pathname') ?? '';
  const { locale } = await params;
  return (
    // The intl provider sits OUTSIDE the Suspense boundary so the loading
    // skeletons (which are Client Components using useTranslations) resolve
    // against the mypage dictionary too, not just the global one.
    <ScopedIntlProvider scope="mypage" locale={locale}>
      <Suspense fallback={resolveLoadingFallback(pathname)}>
        <ProtectedGate params={params}>{children}</ProtectedGate>
      </Suspense>
    </ScopedIntlProvider>
  );
}

async function ProtectedGate({ children, params }: Props) {
  // getOptionalUser is React.cache()-wrapped, so the nested (confirmed)/
  // (provisional) layouts' getAuthenticatedUser share this Auth round-trip
  // instead of issuing a second one.
  const user = await getOptionalUser();

  const { locale } = await params;

  if (!user) {
    // Normally unreachable — the proxy's `/mypage` guard redirects first, and
    // it is the one that carries the return target in practice. Kept in sync
    // with it so this fallback does not silently drop the destination if the
    // proxy's path list ever stops covering a protected route.
    redirect(
      withReturnPath(`/${locale}/sign-in?toast=sign_in_required`, await getCurrentReturnTarget())
    );
  }

  if (await isUserBanned(user.id)) {
    redirect(`/${locale}/banned`);
  }

  return <>{children}</>;
}
