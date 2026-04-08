/**
 * Public Profile (公開プロフィールページ)
 *
 * @description Displays another user's public profile including avatar, display name, bio,
 * follow relationships, topic posts, and achievements. Shows edit link and following count for own profile.
 *
 * @flow
 * 1. Fetch profile by `[username]` from URL (404 if not found)
 * 2. Determine relationship with logged-in user (follow state)
 * 3. Fetch posts and achievements in parallel, render with pagination
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Link } from '@/i18n/routing';
import { and, count, eq, isNull } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { getAchievementCategoryNames } from '@/lib/achievements/display';
import { countryCodeToFlag } from '@/lib/countries';
import { db, profiles, userFollows } from '@/lib/db';
import { getUserAchievements } from '@/lib/db/achievement-queries';
import { createClient } from '@/lib/supabase/server';

import { getPostsByUserId } from '@/app/[locale]/(public)/topics/_lib/queries';
import { LinkedText, PagePanel, UserAvatar } from '@/app/[locale]/_components';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { FollowButton } from './_components/FollowButton';
import { ProfileAchievements } from './_components/ProfileAchievements';
import { ProfilePosts } from './_components/ProfilePosts';
import { SocialLinks } from './_components/SocialLinks';
import { getProfileByUsername } from './_lib/queries';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 5;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

type Props = {
  params: Promise<{ locale: Locale; username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, username } = await params;

  const profile = await getProfileByUsername(username);

  if (!profile) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  return {
    title: resolveTitle(t('title', { displayName: profile.displayName ?? username }), locale),
    description:
      profile.bio || t('defaultDescription', { displayName: profile.displayName ?? username }),
    alternates: {
      canonical: `/${locale}/@/${username}`,
    },
  };
}

export default async function PublicProfilePage({ params, searchParams }: Props) {
  const { locale, username } = await params;

  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwnProfile = user?.id === profile.id;

  // Build all independent follow queries and run them in parallel
  const followCheckPromise =
    user && !isOwnProfile
      ? db
          .select({ id: userFollows.id })
          .from(userFollows)
          .where(and(eq(userFollows.followerId, user.id), eq(userFollows.followingId, profile.id)))
          .limit(1)
      : Promise.resolve([]);

  const reverseFollowCheckPromise =
    user && !isOwnProfile
      ? db
          .select({ id: userFollows.id })
          .from(userFollows)
          .where(and(eq(userFollows.followerId, profile.id), eq(userFollows.followingId, user.id)))
          .limit(1)
      : Promise.resolve([]);

  const followerCountPromise = db
    .select({ count: count() })
    .from(userFollows)
    .innerJoin(profiles, eq(userFollows.followerId, profiles.id))
    .where(and(eq(userFollows.followingId, profile.id), isNull(profiles.deletedAt)));

  const followingCountPromise = isOwnProfile
    ? db
        .select({ count: count() })
        .from(userFollows)
        .innerJoin(profiles, eq(userFollows.followingId, profiles.id))
        .where(and(eq(userFollows.followerId, profile.id), isNull(profiles.deletedAt)))
    : Promise.resolve([{ count: 0 }]);

  const [
    existingFollowRows,
    reverseFollowRows,
    [followerResult],
    [followingResult],
    t,
    tTopics,
    tSquares,
    tOpenings,
    allPosts,
    userAchievementRows,
  ] = await Promise.all([
    followCheckPromise,
    reverseFollowCheckPromise,
    followerCountPromise,
    followingCountPromise,
    getTranslations({ locale, namespace: 'publicProfile' }),
    getTranslations({ locale, namespace: 'topics' }),
    getTranslations({ locale, namespace: 'topics.squares' }),
    getTranslations({ locale, namespace: 'topics.openings' }),
    getPostsByUserId(profile.id, user?.id),
    getUserAchievements(profile.id),
  ]);

  const initialFollowing = !!existingFollowRows[0];
  const followedByProfile = !!reverseFollowRows[0];
  const followerCount = followerResult.count;
  const followingCount = followingResult.count;

  const { page } = await searchParamsCache.parse(searchParams);
  const totalCount = allPosts.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));
  const posts = allPosts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const buildHref = (p: number) => {
    const qs = p > 1 ? `?page=${p}` : '';
    return `/${locale}/@/${username}${qs}`;
  };

  return (
    <PagePanel>
      <div className="space-y-6">
        {/* Avatar */}
        <UserAvatar
          src={profile.avatarUrl}
          alt={profile.displayName ?? profile.username}
          size={96}
        />

        {/* Display Name + Action Button Row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {profile.displayName}
              {profile.flair && <span className="ml-2">{profile.flair}</span>}
              {profile.country && (
                <span className="ml-2">{countryCodeToFlag(profile.country)}</span>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">@{profile.username}</p>
          </div>
          <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
            {isOwnProfile ? (
              <Link
                href="/mypage/profile"
                locale={locale}
                className="rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                {t('editProfile')}
              </Link>
            ) : (
              <>
                {followedByProfile && (
                  <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground mr-3 sm:mr-0">
                    {t('followsYou')}
                  </span>
                )}
                <FollowButton
                  targetUsername={profile.username}
                  locale={locale}
                  initialFollowing={initialFollowing}
                  isAuthenticated={!!user}
                />
              </>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <p className="text-sm text-muted-foreground">
          {isOwnProfile && (
            <>
              <Link href="/mypage/following" locale={locale} className="hover:underline">
                <span className="font-semibold text-foreground">{followingCount}</span>{' '}
                {t('followingCount')}
              </Link>
              <span className="mx-2" />
            </>
          )}
          <Link href={`/@/${username}/followers`} locale={locale} className="hover:underline">
            <span className="font-semibold text-foreground">{followerCount}</span> {t('followers')}
          </Link>
        </p>

        {/* External Links */}
        <SocialLinks
          fideId={profile.fideId}
          chesscomUsername={profile.chesscomUsername}
          lichessUsername={profile.lichessUsername}
          xUsername={profile.xUsername}
          instagramUsername={profile.instagramUsername}
          youtubeHandle={profile.youtubeHandle}
        />

        {/* Bio */}
        {profile.bio && (
          <div className="space-y-3">
            <h2 className="text-base md:text-lg font-medium border-b border-border pb-2 leading-normal">
              {t('bio')}
            </h2>
            <p className="text-foreground whitespace-pre-wrap break-words">
              <LinkedText text={profile.bio} locale={locale} />
            </p>
          </div>
        )}

        {/* Topics Tab */}
        <ProfilePosts
          posts={posts}
          totalCount={totalCount}
          currentPage={currentPage}
          totalPages={totalPages}
          locale={locale}
          buildHref={buildHref}
          labels={{
            topicsTab: t('topicsTab'),
            noTopicPosts: t('noTopicPosts'),
            showMore: tTopics('showMore'),
            justNow: (topicType) =>
              topicType === 'opening' ? tOpenings('justNow') : tSquares('justNow'),
            newReply: (topicType) =>
              topicType === 'opening'
                ? tOpenings('newReply', { time: '{time}' })
                : tSquares('newReply', { time: '{time}' }),
          }}
        />

        {/* Achievements */}
        {userAchievementRows.length > 0 && (
          <ProfileAchievements
            achievements={userAchievementRows}
            locale={locale}
            limit={4}
            totalCount={userAchievementRows.length}
            username={username}
            labels={{
              sectionTitle: t('achievementsSection'),
              noAchievements: t('noAchievements'),
              viewAll: t('viewAllAchievements'),
              categoryNames: getAchievementCategoryNames(t),
            }}
          />
        )}
      </div>
    </PagePanel>
  );
}
