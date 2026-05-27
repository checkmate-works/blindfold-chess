/**
 * Public Profile
 *
 * @description Displays another user's public profile including avatar, display name, bio,
 * follow relationships, topic posts, and achievements. Shows edit link and following count for own profile.
 *
 * @flow
 * 1. Fetch profile by `[username]` from URL (404 if not found)
 * 2. Determine relationship with logged-in user (follow state)
 * 3. Fetch posts and achievements in parallel, render with pagination
 *
 * NOTE: This route was originally located at `(public)/profile/[username]/` and served
 * under the URL `/@/username` via a rewrite rule. However, `@` is a reserved character
 * in Next.js App Router (used for parallel routes), which caused client-side navigation
 * to fail with route resolution errors (404). The directory was renamed to `u/` so the
 * URL is now `/u/username`. A 301 redirect from `/@/` to `/u/` is configured in
 * next.config.ts for backwards compatibility.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Link } from '@/i18n/routing';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { getAchievementCategoryNames } from '@/lib/achievements/display';
import { EMPTY_REPLY_META } from '@/lib/db/reply-meta-queries';
import { createClient } from '@/lib/supabase/server';

import { LinkedText, PageLayout } from '@/app/[locale]/_components';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { FollowButton } from './_components/FollowButton';
import { ProfileAchievements } from './_components/ProfileAchievements';
import { ProfileHeader } from './_components/ProfileHeader';
import { ProfilePosts } from './_components/ProfilePosts';
import { ProfileProblems } from './_components/ProfileProblems';
import { SocialLinks } from './_components/SocialLinks';
import { loadPublicProfilePageData } from './_lib/load-page-data';
import { getProfileByUsername } from './_lib/queries';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 5;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  tab: parseAsString.withDefault('topics'),
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
      canonical: `/${locale}/u/${username}`,
    },
  };
}

export default async function PublicProfilePage({ params, searchParams }: Props) {
  const { locale, username } = await params;

  const supabase = await createClient();
  const [profile, parsedParams, authResult] = await Promise.all([
    getProfileByUsername(username),
    searchParamsCache.parse(searchParams),
    supabase.auth.getUser(),
  ]);

  if (!profile) {
    notFound();
  }

  const user = authResult.data.user;
  const isOwnProfile = user?.id === profile.id;

  const [pageData, t, tTopics, tSquares, tOpenings, tPuzzle, tMemory] = await Promise.all([
    loadPublicProfilePageData({
      profileId: profile.id,
      currentUserId: user?.id,
      isOwnProfile,
      parsedParams,
      pageSize: PAGE_SIZE,
    }),
    getTranslations({ locale, namespace: 'publicProfile' }),
    getTranslations({ locale, namespace: 'topics' }),
    getTranslations({ locale, namespace: 'topics.squares' }),
    getTranslations({ locale, namespace: 'topics.openings' }),
    getTranslations({ locale, namespace: 'practice.puzzle' }),
    getTranslations({ locale, namespace: 'practice.positionMemory' }),
  ]);

  const {
    activeTab,
    initialFollowing,
    followedByProfile,
    followerCount,
    followingCount,
    posts,
    topicsCount,
    topicsCurrentPage,
    topicsTotalPages,
    problemPositions,
    problemsCount,
    problemsCurrentPage,
    problemsTotalPages,
    problemLikeMetaMap,
    problemReplyMetaMap,
    userAchievementRows,
  } = pageData;

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (activeTab !== 'topics') params.set('tab', activeTab);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/${locale}/u/${username}${qs ? `?${qs}` : ''}`;
  };

  const buildTabHref = (targetTab: string) => {
    if (targetTab === 'topics') return `/u/${username}`;
    return `/u/${username}?tab=${targetTab}`;
  };

  return (
    <PageLayout title={t('pageTitle')} locale={locale}>
      <div className="space-y-6">
        <ProfileHeader
          avatarUrl={profile.avatarUrl}
          username={profile.username}
          displayName={profile.displayName}
          flair={profile.flair}
          country={profile.country}
          locale={locale}
          action={
            isOwnProfile ? (
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
            )
          }
        />

        {/* Stats Row */}
        <p className="text-sm text-muted-foreground">
          {isOwnProfile && (
            <>
              <Link href="/mypage/following" locale={locale} className={TEXT_LINK_CLASSES}>
                <span className="font-semibold text-foreground">{followingCount}</span>{' '}
                {t('followingCount')}
              </Link>
              <span className="mx-2" />
            </>
          )}
          <Link href={`/u/${username}/followers`} locale={locale} className={TEXT_LINK_CLASSES}>
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

        {/* Topics / Problems Tabs */}
        <ProfilePosts
          posts={posts}
          totalCount={topicsCount}
          problemsCount={problemsCount}
          activeTab={activeTab}
          currentPage={topicsCurrentPage}
          totalPages={topicsTotalPages}
          locale={locale}
          buildHref={buildHref}
          buildTabHref={buildTabHref}
          labels={{
            topicsTab: t('topicsTab'),
            problemsTab: t('problemsTab'),
            noTopicPosts: t('noTopicPosts'),
            showMore: tTopics('showMore'),
            justNow: (topicType) =>
              topicType === 'opening' ? tOpenings('justNow') : tSquares('justNow'),
          }}
        >
          <ProfileProblems
            positions={problemPositions}
            authorProfile={{
              username: profile.username,
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl,
            }}
            likeMetaMap={problemLikeMetaMap}
            replyMetaMap={problemReplyMetaMap}
            emptyReplyMeta={EMPTY_REPLY_META}
            currentPage={problemsCurrentPage}
            totalPages={problemsTotalPages}
            locale={locale}
            buildHref={buildHref}
            justNowLabels={{
              puzzle: tPuzzle('justNow'),
              memory: tMemory('justNow'),
            }}
            labels={{
              noProblems: t('noProblems'),
              problemTypeMemory: t('problemTypeMemory'),
              problemTypePuzzle: t('problemTypePuzzle'),
            }}
          />
        </ProfilePosts>

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
    </PageLayout>
  );
}
