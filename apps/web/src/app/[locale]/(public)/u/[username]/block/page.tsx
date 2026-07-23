import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { and, eq, isNull } from 'drizzle-orm';

import { db, profiles } from '@/lib/db';
import { hasBlocked } from '@/lib/moderation/block';
import { createClient } from '@/lib/supabase/server';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { BlockActions } from './_components/BlockActions';

// Per-user, per-locale URL — render dynamically like the rest of /u/[username].
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: Locale; username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, username } = await params;

  const [profile] = await db
    .select({ displayName: profiles.displayName })
    .from(profiles)
    .where(and(eq(profiles.username, username), isNull(profiles.deletedAt)))
    .limit(1);

  if (!profile) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'publicProfile' });
  const displayName = profile.displayName ?? username;

  return {
    title: resolveTitle(t('blockPageTitle', { displayName }), locale),
    robots: { index: false, follow: false },
    alternates: {
      canonical: `/${locale}/u/${username}/block`,
    },
  };
}

export default async function BlockUserPage({ params }: Props) {
  const { locale, username } = await params;

  const [[profile], authResult] = await Promise.all([
    db
      .select({ id: profiles.id, displayName: profiles.displayName })
      .from(profiles)
      .where(and(eq(profiles.username, username), isNull(profiles.deletedAt)))
      .limit(1),
    createClient().then((supabase) => supabase.auth.getUser()),
  ]);

  if (!profile) {
    notFound();
  }

  // Blocking requires being signed in, and blocking yourself is nonsensical —
  // hide the page for anonymous viewers and for the profile owner.
  const user = authResult.data.user;
  if (!user || user.id === profile.id) {
    notFound();
  }

  const [t, initialBlocked] = await Promise.all([
    getTranslations({ locale, namespace: 'publicProfile' }),
    hasBlocked(user.id, profile.id),
  ]);
  const displayName = profile.displayName ?? username;

  return (
    <PageLayout
      title={t('blockPageTitle', { displayName })}
      locale={locale}
      breadcrumb={[{ label: displayName, href: `/u/${username}` }, { label: t('block') }]}
    >
      <div className="space-y-6">
        <SectionTitle>{t('blockSectionTitle')}</SectionTitle>
        <BlockActions
          targetUsername={username}
          locale={locale}
          initialBlocked={initialBlocked}
          labels={{
            block: t('block'),
            unblock: t('unblock'),
            blockDescription: t('blockDescription', { displayName: `@${username}` }),
            blockedState: t('blockedState', { displayName: `@${username}` }),
            error: t('blockError'),
          }}
        />
      </div>
    </PageLayout>
  );
}
