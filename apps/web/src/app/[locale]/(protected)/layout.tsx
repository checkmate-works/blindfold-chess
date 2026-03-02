import { redirect } from 'next/navigation';

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

  if (!user) {
    const { locale } = await params;
    redirect(`/${locale}/sign-in?toast=sign_in_required`);
  }

  return <>{children}</>;
}
