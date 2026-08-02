/**
 * Public Profile (公開プロフィール)
 *
 * @description Another member's public profile: identity header, a standing
 * band of rank / achievements / archive counts, and a timeline of everything
 * they have posted, filterable by entity type.
 *
 * @flow
 * 1. Fetch profile by `[username]` from URL (404 if not found)
 * 2. Determine relationship with logged-in user (follow / block state)
 * 3. Load shell data, belt rank, and the first timeline page in parallel
 * 4. Render the timeline; the client pages further via `getProfileFeed`
 *
 * @design Timeline here, archives elsewhere
 * This page shows recent activity and scrolls indefinitely, so it cannot also
 * host a paginated archive — those live at `/posts`, `/games` and
 * `/problems/*`, reached from the stats band. It also means nothing may be
 * rendered *after* the timeline: a section below an infinite scroll is
 * unreachable, which is why achievements moved up into the band.
 *
 * @design Timeline completeness
 * The timeline reads `feed_items`, which only has rows for activity since the
 * feed shipped (there was deliberately no backfill), and whose
 * `challenge_rank_update` rows are reaped after 30 days. The archives remain
 * the complete record, so every empty timeline view links to them — see
 * `ProfileTimelineEmpty`.
 *
 * NOTE: This route was originally located at `(public)/profile/[username]/` and served
 * under the URL `/@/username` via a rewrite rule. However, `@` is a reserved character
 * in Next.js App Router (used for parallel routes), which caused client-side navigation
 * to fail with route resolution errors (404). The directory was renamed to `u/` so the
 * URL is now `/u/username`. A 301 redirect from `/@/` to `/u/` is configured in
 * next.config.ts for backwards compatibility.
 */
import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { countTotalEarned } from '@/lib/db/achievement-queries';

import { FeedSkeleton } from '@/app/[locale]/(public)/(home)/_components/FeedSkeleton';
import { HelpTourButton, PageLayout } from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ProfileBlockedNotice } from './_components/ProfileBlockedNotice';
import { ProfileFeedFilterChips } from './_components/ProfileFeedFilterChips';
import { ProfileIdentitySection } from './_components/ProfileIdentitySection';
import { ProfileStatsBand } from './_components/ProfileStatsBand';
import { ProfileTimeline } from './_components/ProfileTimeline';
import { resolveProfileViewer } from './_lib/load-archive-context';
import { loadPublicProfilePageData } from './_lib/load-page-data';
import { parseProfileFeedFilter } from './_lib/profile-feed-filters';
import { getProfileByUsername } from './_lib/queries';

export const dynamic = 'force-dynamic';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  tab: parseAsString.withDefault(''),
  filter: parseAsString.withDefault(''),
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

  const [viewer, parsedParams] = await Promise.all([
    resolveProfileViewer(username),
    searchParamsCache.parse(searchParams),
  ]);

  // Back-compat with the tab-based profile: `?tab=games` and a bare `?page=N`
  // (which used to page the topics tab) now belong to the archive routes.
  if (parsedParams.tab === 'games') {
    redirect(
      `/${locale}/u/${username}/games${parsedParams.page > 1 ? `?page=${parsedParams.page}` : ''}`
    );
  }
  if (parsedParams.tab === 'problems') {
    redirect(`/${locale}/u/${username}/problems/puzzles`);
  }
  if (parsedParams.page > 1) {
    redirect(`/${locale}/u/${username}/posts?page=${parsedParams.page}`);
  }

  const filter = parseProfileFeedFilter(parsedParams.filter);
  const { profile, currentUserId, isOwnProfile } = viewer;

  const [pageData, t] = await Promise.all([
    loadPublicProfilePageData({ profileId: profile.id, currentUserId, isOwnProfile }),
    getTranslations({ locale, namespace: 'publicProfile' }),
  ]);

  // A block in either direction collapses the profile to its identity header
  // plus a notice — the timeline and stats are hidden from the blocked
  // viewer's in-app view. (Direct URLs / SEO pages stay public by design.)
  const restricted = !isOwnProfile && (pageData.viewerHasBlocked || pageData.blockedByProfile);

  const helpSteps: HelpStep[] = [
    {
      targetId: 'profile-stats-band',
      title: t('help.stats.title'),
      description: t('help.stats.description'),
      side: 'bottom',
      align: 'start',
    },
    {
      targetId: 'profile-timeline',
      title: t('help.timeline.title'),
      description: t('help.timeline.description'),
      side: 'top',
      align: 'start',
    },
  ];

  return (
    <PageLayout
      title={t('pageTitle')}
      locale={locale}
      titleAction={!restricted && <HelpTourButton steps={helpSteps} label={t('help.label')} />}
    >
      <div className="space-y-6">
        <ProfileIdentitySection
          profile={profile}
          locale={locale}
          isOwnProfile={isOwnProfile}
          isAuthenticated={!!currentUserId}
          initialFollowing={pageData.initialFollowing}
          followedByProfile={pageData.followedByProfile}
          viewerHasBlocked={pageData.viewerHasBlocked}
          restricted={restricted}
          followerCount={pageData.followerCount}
          followingCount={pageData.followingCount}
          labels={{
            editProfile: t('editProfile'),
            followsYou: t('followsYou'),
            followingCount: t('followingCount'),
            followers: t('followers'),
            bio: t('bio'),
            moreActions: t('moreActions'),
            block: t('block'),
            unblock: t('unblock'),
            blockedBadge: t('blockedBadge'),
          }}
        />
        {restricted ? (
          <ProfileBlockedNotice
            message={pageData.viewerHasBlocked ? t('blockedNoticeByYou') : t('blockedNoticeByThem')}
          />
        ) : (
          <>
            <ProfileStatsBand
              username={username}
              locale={locale}
              rankSlug={pageData.rankSlug}
              achievements={pageData.userAchievementGroups}
              achievementCount={countTotalEarned(pageData.userAchievementGroups)}
              postsCount={pageData.allPosts.length}
              problemsCount={pageData.problemsCount}
              gamesCount={pageData.gamesCount}
            />

            <div className="space-y-4" data-tour-id="profile-timeline">
              <ProfileFeedFilterChips username={username} locale={locale} activeFilter={filter} />

              {/* Keyed by filter for two reasons, both load-bearing: it shows
                  the skeleton on every filter switch (not just the first
                  render), and it remounts FeedClient so the new page's items
                  replace the old ones — see ProfileTimeline's TSDoc. */}
              <Suspense key={filter} fallback={<FeedSkeleton />}>
                <ProfileTimeline
                  profileId={profile.id}
                  username={username}
                  locale={locale}
                  currentUserId={currentUserId}
                  filter={filter}
                />
              </Suspense>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
