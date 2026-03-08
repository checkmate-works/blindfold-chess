import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { and, desc, eq } from 'drizzle-orm';

import { db, moderationActions, profiles } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

export default async function BannedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/sign-in`);
  }

  const [profile] = await db
    .select({ bannedAt: profiles.bannedAt })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile?.bannedAt) {
    redirect(`/${locale}`);
  }

  // Fetch ban reason from moderation_actions audit log
  const [latestBan] = await db
    .select({ reason: moderationActions.reason })
    .from(moderationActions)
    .where(
      and(
        eq(moderationActions.action, 'ban'),
        eq(moderationActions.targetType, 'user'),
        eq(moderationActions.targetId, user.id)
      )
    )
    .orderBy(desc(moderationActions.createdAt))
    .limit(1);

  const t = await getTranslations({ locale, namespace: 'banned' });

  return (
    <div className="max-w-lg mx-auto py-16 text-center">
      <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
      <p className="text-muted-foreground mb-4">{t('message')}</p>
      {latestBan?.reason && (
        <p className="text-sm text-muted-foreground mb-4">
          {t('reason', { reason: latestBan.reason })}
        </p>
      )}
      <p className="text-sm text-muted-foreground">{t('contact')}</p>
    </div>
  );
}
