import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { and, desc, eq } from 'drizzle-orm';

import { getOptionalUser } from '@/lib/auth';
import { db, moderationActions, profiles } from '@/lib/db';

import type { LocalePageProps } from '@/app/[locale]/_lib/types';

export const dynamic = 'force-dynamic';

export default async function BannedPage({ params }: LocalePageProps) {
  const { locale } = await params;
  const user = await getOptionalUser();

  if (!user) {
    redirect(`/${locale}/sign-in`);
  }

  // The ban flag and the ban reason (moderation_actions audit log) are both
  // keyed on the user; a non-banned visitor redirects and discards the reason.
  const [[profile], [latestBan], t] = await Promise.all([
    db
      .select({ bannedAt: profiles.bannedAt })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1),
    db
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
      .limit(1),
    getTranslations({ locale, namespace: 'banned' }),
  ]);

  if (!profile?.bannedAt) {
    redirect(`/${locale}`);
  }

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
