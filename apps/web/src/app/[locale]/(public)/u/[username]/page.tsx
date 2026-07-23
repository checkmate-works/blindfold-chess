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

import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { getAchievementCategoryNames } from '@/lib/achievements/display';
import { EMPTY_REPLY_META } from '@/lib/db/reply-meta-queries';
import { createClient } from '@/lib/supabase/server';

import { getOpeningDisplayName } from '@/app/[locale]/(public)/topics/openings/_lib/get-opening-display-name';
import { PageLayout } from '@/app/[locale]/_components';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ProfileAchievements } from './_components/ProfileAchievements';
import { ProfileGames } from './_components/ProfileGames';
import { ProfileIdentitySection } from './_components/ProfileIdentitySection';
import { ProfilePosts } from './_components/ProfilePosts';
import { buildTabHref } from './_lib/build-tab-href';
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

  const [pageData, t, tTopics, tSquares, tOpenings, tPlay, tSharedGames, tOpeningNames] =
    await Promise.all([
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
      getTranslations({ locale, namespace: 'play' }),
      getTranslations({ locale, namespace: 'sharedGames' }),
      getTranslations({ locale, namespace: 'topics.openings.names' }),
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
    problemsCount,
    games,
    gamesCount,
    gamesCurrentPage,
    gamesTotalPages,
    gameLikeMetaMap,
    gameReplyMetaMap,
    userAchievementRows,
  } = pageData;

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (activeTab !== 'topics') params.set('tab', activeTab);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/${locale}/u/${username}${qs ? `?${qs}` : ''}`;
  };

  return (
    <PageLayout title={t('pageTitle')} locale={locale}>
      <div className="space-y-6">
        <ProfileIdentitySection
          profile={profile}
          locale={locale}
          isOwnProfile={isOwnProfile}
          isAuthenticated={!!user}
          initialFollowing={initialFollowing}
          followedByProfile={followedByProfile}
          followerCount={followerCount}
          followingCount={followingCount}
          labels={{
            editProfile: t('editProfile'),
            followsYou: t('followsYou'),
            followingCount: t('followingCount'),
            followers: t('followers'),
            bio: t('bio'),
            moreActions: t('moreActions'),
            block: t('block'),
          }}
        />
        {/* Topics / Problems / Games Tabs */}
        <ProfilePosts
          posts={posts}
          totalCount={topicsCount}
          problemsCount={problemsCount}
          gamesCount={gamesCount}
          activeTab={activeTab}
          currentPage={topicsCurrentPage}
          totalPages={topicsTotalPages}
          locale={locale}
          buildHref={buildHref}
          buildTabHref={(targetTab) => buildTabHref(username, targetTab)}
          labels={{
            topicsTab: t('topicsTab'),
            problemsTab: t('problemsTab'),
            gamesTab: t('gamesTab'),
            noTopicPosts: t('noTopicPosts'),
            showMore: tTopics('showMore'),
            justNow: (topicType) =>
              topicType === 'opening' ? tOpenings('justNow') : tSquares('justNow'),
          }}
          gamesSlot={
            <ProfileGames
              games={games}
              likeMetaMap={gameLikeMetaMap}
              replyMetaMap={gameReplyMetaMap}
              emptyReplyMeta={EMPTY_REPLY_META}
              currentPage={gamesCurrentPage}
              totalPages={gamesTotalPages}
              locale={locale}
              buildHref={buildHref}
              justNowLabel={tSharedGames('detail.justNow')}
              colorLabels={{
                white: tPlay('playerColor.white'),
                black: tPlay('playerColor.black'),
              }}
              resolveOpeningName={(slug, fallbackName) =>
                getOpeningDisplayName(tOpeningNames, slug, fallbackName)
              }
              labels={{
                noGames: t('noGames'),
              }}
            />
          }
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
    </PageLayout>
  );
}
