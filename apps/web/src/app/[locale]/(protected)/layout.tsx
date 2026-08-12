import { Suspense } from 'react';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { withReturnPath } from '@/lib/auth-return-path';
import { getCurrentReturnTarget } from '@/lib/current-return-target';
import { isUserBanned } from '@/lib/moderation/ban';
import { createClient } from '@/lib/supabase/server';

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
 * artifact. See `apps/web/CLAUDE.md` ("Known Issues") for the full
 * investigation. Moving the redirect decision up into `ProtectedGate` (this
 * function, still inside the same Suspense) was tried and does NOT fix it —
 * the race is about streaming under Suspense, not about which async component
 * throws the redirect or how deeply it's nested. The only reproduction that
 * eliminated it was removing this `<Suspense>` entirely, which reintroduces
 * the blank-page-on-slow-auth problem this boundary exists to prevent (see
 * above) — so a real fix needs a different approach, not a quick swap.
 */
export default async function ProtectedLayout({ children, params }: Props) {
  const pathname = (await headers()).get('x-pathname') ?? '';
  return (
    <Suspense fallback={resolveLoadingFallback(pathname)}>
      <ProtectedGate params={params}>{children}</ProtectedGate>
    </Suspense>
  );
}

async function ProtectedGate({ children, params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
