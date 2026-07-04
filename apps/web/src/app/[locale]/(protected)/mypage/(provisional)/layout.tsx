import { redirect } from 'next/navigation';

import { eq } from 'drizzle-orm';

import { getAuthenticatedUser } from '@/lib/auth';
import { db, profiles } from '@/lib/db';

/**
 * @knownIssue This redirect can intermittently crash the client with a
 * hooks-mismatch hydration error right after finishing sign-up. See the
 * `@knownIssue` note on `(protected)/layout.tsx` and "Known Issues" in
 * `apps/web/CLAUDE.md` before attempting a fix here — moving this redirect
 * around inside the Suspense tree was already tried and did not help.
 */
export default async function ProvisionalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const user = await getAuthenticatedUser();

  const [profile] = await db
    .select({ username: profiles.username })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (profile) {
    const { locale } = await params;
    redirect(`/${locale}/mypage`);
  }

  return <>{children}</>;
}
