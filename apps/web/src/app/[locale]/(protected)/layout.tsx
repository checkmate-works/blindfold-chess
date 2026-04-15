import { redirect } from 'next/navigation';

import { isUserBanned } from '@/lib/moderation/ban';
import { createClient } from '@/lib/supabase/server';

export default async function ProtectedLayout({
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

  const { locale } = await params;

  if (!user) {
    redirect(`/${locale}/sign-in?toast=sign_in_required`);
  }

  if (await isUserBanned(user.id)) {
    redirect(`/${locale}/banned`);
  }

  return <>{children}</>;
}
