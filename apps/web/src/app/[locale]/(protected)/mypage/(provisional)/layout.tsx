import { redirect } from 'next/navigation';

import { eq } from 'drizzle-orm';

import { getAuthenticatedUser } from '@/lib/auth';
import { db, profiles } from '@/lib/db';

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
