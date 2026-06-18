import { Suspense } from 'react';

import { redirect } from 'next/navigation';

import { isUserBanned } from '@/lib/moderation/ban';
import { createClient } from '@/lib/supabase/server';

import { MypageLoadingFallback } from './mypage/(confirmed)/_components/MypageDashboardSkeleton';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Auth gate for the whole protected area (mypage).
 *
 * This layout is deliberately **synchronous** and wraps the actual gate in an
 * explicit `<Suspense>`. The gate (`ProtectedGate`) awaits
 * `supabase.auth.getUser()` — a network round-trip to the Auth server that can
 * take ~1–2s. If that await lived directly on an `async` layout, it would run
 * *before* React reached any Suspense boundary, so on a hard navigation (the
 * post-sign-in `window.location` redirect to `/mypage`) the main content area
 * stayed blank until it resolved. `loading.tsx` does NOT help here: it only
 * wraps a layout's *children*, not the layout's own await.
 *
 * By keeping the layout sync and pushing the await into a Suspense-wrapped
 * child, React hits the boundary immediately and streams the skeleton while
 * `getUser()` is in flight. The same fallback covers the nested `(confirmed)`
 * layout auth + dashboard data fetch, so it's one continuous skeleton.
 */
export default function ProtectedLayout({ children, params }: Props) {
  return (
    <Suspense fallback={<MypageLoadingFallback />}>
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
