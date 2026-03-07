import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { and, count, eq, isNull } from 'drizzle-orm';
import { SiChessdotcom, SiLichess } from 'react-icons/si';

import { countryCodeToFlag } from '@/lib/countries';
import { db, follows, profiles } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

import { PagePanel, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { FollowButton } from './_components/FollowButton';

type Props = {
  params: Promise<{ locale: Locale; username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, username } = await params;

  const [profile] = await db
    .select({
      displayName: profiles.displayName,
      bio: profiles.bio,
    })
    .from(profiles)
    .where(and(eq(profiles.username, username), isNull(profiles.deletedAt)))
    .limit(1);

  if (!profile) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  return {
    title: t('title', { displayName: profile.displayName ?? username }),
    description:
      profile.bio || t('defaultDescription', { displayName: profile.displayName ?? username }),
    alternates: {
      canonical: `/${locale}/@/${username}`,
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { locale, username } = await params;

  const [profile] = await db
    .select({
      id: profiles.id,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      bio: profiles.bio,
      country: profiles.country,
      flair: profiles.flair,
      fideId: profiles.fideId,
      chesscomUsername: profiles.chesscomUsername,
      lichessUsername: profiles.lichessUsername,
    })
    .from(profiles)
    .where(and(eq(profiles.username, username), isNull(profiles.deletedAt)))
    .limit(1);

  if (!profile) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwnProfile = user?.id === profile.id;

  let initialFollowing = false;
  if (user && !isOwnProfile) {
    const [existingFollow] = await db
      .select({ id: follows.id })
      .from(follows)
      .where(and(eq(follows.followerId, user.id), eq(follows.followingId, profile.id)))
      .limit(1);
    initialFollowing = !!existingFollow;
  }

  const [followerResult] = await db
    .select({ count: count() })
    .from(follows)
    .where(eq(follows.followingId, profile.id));
  const followerCount = followerResult.count;

  let followingCount = 0;
  if (isOwnProfile) {
    const [followingResult] = await db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followerId, profile.id));
    followingCount = followingResult.count;
  }

  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  const hasChessAccounts = profile.fideId || profile.chesscomUsername || profile.lichessUsername;
  const isEmptyProfile = !profile.bio && !hasChessAccounts;

  return (
    <PagePanel>
      <div className="space-y-8">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.displayName ?? profile.username}
                width={64}
                height={64}
                className="rounded-full object-cover h-16 w-16"
                unoptimized
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-8 w-8"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {profile.displayName}
                {profile.flair && <span className="ml-2">{profile.flair}</span>}
                {profile.country && (
                  <span className="ml-2">{countryCodeToFlag(profile.country)}</span>
                )}
              </h1>
              <p className="text-muted-foreground mt-1">@{profile.username}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isOwnProfile && (
                  <>
                    <span className="font-semibold text-foreground">{followingCount}</span>{' '}
                    {t('followingCount')}
                    <span className="mx-2" />
                  </>
                )}
                <span className="font-semibold text-foreground">{followerCount}</span>{' '}
                {t('followers')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {!isOwnProfile && (
              <FollowButton
                targetUsername={profile.username}
                locale={locale}
                initialFollowing={initialFollowing}
                isAuthenticated={!!user}
              />
            )}
            {hasChessAccounts && (
              <>
                {profile.fideId && (
                  <a
                    href={`https://ratings.fide.com/profile/${profile.fideId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="FIDE profile"
                    title="FIDE"
                    className="opacity-70 transition-opacity hover:opacity-100"
                  >
                    <Image
                      src="/images/fide-favicon.ico"
                      alt="FIDE"
                      width={24}
                      height={24}
                      unoptimized
                    />
                  </a>
                )}
                {profile.chesscomUsername && (
                  <a
                    href={`https://www.chess.com/member/${profile.chesscomUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Chess.com profile"
                    title="Chess.com"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <SiChessdotcom size={24} />
                  </a>
                )}
                {profile.lichessUsername && (
                  <a
                    href={`https://lichess.org/@/${profile.lichessUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Lichess profile"
                    title="Lichess"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <SiLichess size={24} />
                  </a>
                )}
              </>
            )}
          </div>
        </div>

        {/* Profile Content */}
        {isEmptyProfile ? (
          <div className="p-8 border-border border-2 border-dashed rounded-lg text-center">
            <p className="text-muted-foreground">{t('emptyProfile')}</p>
          </div>
        ) : profile.bio ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <SectionTitle>{t('bio')}</SectionTitle>
              <p className="text-foreground whitespace-pre-wrap">{profile.bio}</p>
            </div>
          </div>
        ) : null}
      </div>
    </PagePanel>
  );
}
