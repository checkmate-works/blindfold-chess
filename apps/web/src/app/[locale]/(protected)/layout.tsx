import { Suspense } from 'react';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { isUserBanned } from '@/lib/moderation/ban';
import { createClient } from '@/lib/supabase/server';

import { MypageLoadingFallback } from './_components/MypageLoadingFallback';
import { MypageDashboardLoadingFallback } from './mypage/(confirmed)/_components/MypageDashboardLoadingFallback';
import { ProfileLoadingFallback } from './mypage/(confirmed)/profile/_components/ProfileLoadingFallback';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Picks the Suspense fallback that matches the route being loaded. The auth
 * gate below is shared by every mypage route, so on a hard load / refresh its
 * fallback is what the user actually stares at for ~1–2s — a generic skeleton
 * looks misaligned against, say, the profile form. Routes with a tailored
 * skeleton are matched here; everything else gets the neutral fallback.
 */
function resolveLoadingFallback(pathname: string) {
  if (pathname.includes('/mypage/profile')) {
    return <ProfileLoadingFallback />;
  }
  // Dashboard top exactly (`/<locale>/mypage`), not its sub-routes.
  if (/\/mypage\/?$/.test(pathname)) {
    return <MypageDashboardLoadingFallback />;
  }
  return <MypageLoadingFallback />;
}

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
    redirect(`/${locale}/sign-in?toast=sign_in_required`);
  }

  if (await isUserBanned(user.id)) {
    redirect(`/${locale}/banned`);
  }

  return <>{children}</>;
}
