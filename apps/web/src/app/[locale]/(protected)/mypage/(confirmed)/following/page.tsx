import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { and, eq, isNull } from 'drizzle-orm';

import { db, follows, profiles } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

import { Breadcrumb, Divider, PagePanel, PageTitle, UserCard } from '@/app/[locale]/_components';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.mypageFollowing' });

  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

export default async function FollowingPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypageFollowing' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const followingList = await db
    .select({
      id: profiles.id,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(follows)
    .innerJoin(profiles, eq(follows.followingId, profiles.id))
    .where(and(eq(follows.followerId, user!.id), isNull(profiles.deletedAt)));

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>
      <PagePanel>
        {followingList.length === 0 ? (
          <p className="text-muted-foreground">{t('empty')}</p>
        ) : (
          <div className="space-y-3">
            {followingList.map((followedUser) => (
              <UserCard
                key={followedUser.id}
                username={followedUser.username}
                displayName={followedUser.displayName}
                avatarUrl={followedUser.avatarUrl}
                locale={locale}
              />
            ))}
          </div>
        )}

        <Divider />

        <Breadcrumb
          locale={locale}
          items={[{ label: t('breadcrumbMypage'), href: '/mypage' }, { label: t('title') }]}
        />
      </PagePanel>
    </div>
  );
}
