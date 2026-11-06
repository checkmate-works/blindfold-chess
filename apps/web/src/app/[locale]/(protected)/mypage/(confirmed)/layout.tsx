import { redirect } from 'next/navigation';

import { getAuthenticatedUser } from '@/lib/auth';
import { getViewerProfile } from '@/lib/users/viewer-profile';

/**
 * @knownIssue This redirect can intermittently crash the client with a
 * hooks-mismatch hydration error on first-time sign-up. See the
 * `@knownIssue` note on `(protected)/layout.tsx` before attempting a fix
 * here: it lists what was tried, and moving this redirect around inside the
 * Suspense tree is among the things that did not help.
 */
export default async function ConfirmedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const user = await getAuthenticatedUser();

  const profile = await getViewerProfile(user.id);

  if (!profile) {
    const { locale } = await params;
    redirect(`/${locale}/mypage/setup-username`);
  }

  return <>{children}</>;
}
