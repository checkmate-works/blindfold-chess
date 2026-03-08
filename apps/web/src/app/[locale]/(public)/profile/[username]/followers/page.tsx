import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { and, eq, isNull } from 'drizzle-orm';

import { db, follows, profiles } from '@/lib/db';

import { Breadcrumb, Divider, PagePanel, PageTitle, UserCard } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

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
    title: `${t('followersPageTitle')} - ${displayName}`,
    alternates: {
      canonical: `/${locale}/@/${username}/followers`,
    },
  };
}

export default async function FollowersPage({ params }: Props) {
  const { locale, username } = await params;

  const [profile] = await db
    .select({ id: profiles.id, displayName: profiles.displayName })
    .from(profiles)
    .where(and(eq(profiles.username, username), isNull(profiles.deletedAt)))
    .limit(1);

  if (!profile) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  const followerList = await db
    .select({
      id: profiles.id,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(follows)
    .innerJoin(profiles, eq(follows.followerId, profiles.id))
    .where(and(eq(follows.followingId, profile.id), isNull(profiles.deletedAt)));

  const displayName = profile.displayName ?? username;

  return (
    <div className="space-y-8">
      <PageTitle>{t('followersPageTitle')}</PageTitle>
      <PagePanel>
        {followerList.length === 0 ? (
          <p className="text-muted-foreground">{t('noFollowers')}</p>
        ) : (
          <div className="space-y-3">
            {followerList.map((user) => (
              <UserCard
                key={user.id}
                username={user.username}
                displayName={user.displayName}
                avatarUrl={user.avatarUrl}
                locale={locale}
              />
            ))}
          </div>
        )}

        <Divider />

        <Breadcrumb
          locale={locale}
          items={[
            { label: displayName, href: `/@/${username}` },
            { label: t('followersPageTitle') },
          ]}
        />
      </PagePanel>
    </div>
  );
}
