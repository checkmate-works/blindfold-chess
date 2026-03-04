import { redirect } from 'next/navigation';

import { eq } from 'drizzle-orm';

import { db, profiles } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

export default async function ProvisionalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const { locale } = await params;
    redirect(`/${locale}/sign-in`);
  }

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
