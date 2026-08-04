/**
 * Public Profile (公開プロフィール)
 *
 * @description Another member's public profile: identity header, a standing
 * band of rank / achievements, and a timeline of everything they have posted.
 * The first of the four tabs the shell draws.
 *
 * @flow
 * 1. Fetch profile by `[username]` from URL (404 if not found)
 * 2. Determine relationship with logged-in user (follow / block state)
 * 3. Load shell data, then the first timeline page inside `<Suspense>`
 * 4. Render the timeline; the client pages further via `getProfileFeed`
 *
 * @design Timeline here, archives elsewhere
 * This page shows recent activity and scrolls indefinitely, so it cannot also
 * host a paginated archive — those live at `/posts`, `/games` and
 * `/problems/*`, one tab away. Browsing by entity type is therefore the
 * archives' job and the timeline carries no filter of its own: an archive is
 * the complete record, whereas a filtered timeline would show only the slice
 * of it that postdates the feed. It also means nothing may be rendered *after*
 * the timeline: a section below an infinite scroll is unreachable, which is
 * why achievements moved up into the band.
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

import { FeedSkeleton } from '@/app/[locale]/(public)/(home)/_components/FeedSkeleton';
import { HelpTourButton, PageLayout } from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ProfileBlockedNotice } from './_components/ProfileBlockedNotice';
import { ProfileIdentityHeader } from './_components/ProfileIdentityHeader';
import { ProfileShell } from './_components/ProfileShell';
import { ProfileTimeline } from './_components/ProfileTimeline';
import { resolveProfileViewer } from './_lib/load-archive-context';
import { loadProfileShellData } from './_lib/load-profile-shell-data';
import { profileArchiveHref } from './_lib/profile-archive-href';
import { getProfileByUsername } from './_lib/queries';

export const dynamic = 'force-dynamic';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  tab: parseAsString.withDefault(''),
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
  const pageQuery = parsedParams.page > 1 ? `?page=${parsedParams.page}` : '';
  if (parsedParams.tab === 'games') {
    redirect(`/${locale}${profileArchiveHref(username, 'games')}${pageQuery}`);
  }
  if (parsedParams.tab === 'problems') {
    redirect(`/${locale}${profileArchiveHref(username, 'problems')}`);
  }
  if (parsedParams.page > 1) {
    redirect(`/${locale}${profileArchiveHref(username, 'topics')}${pageQuery}`);
  }

  const { profile, currentUserId, isOwnProfile } = viewer;

  const [pageData, t] = await Promise.all([
    loadProfileShellData({ profileId: profile.id, currentUserId, isOwnProfile }),
    getTranslations({ locale, namespace: 'publicProfile' }),
  ]);

  // A block in either direction collapses the profile to its identity header
  // plus a notice — the timeline and stats are hidden from the blocked
  // viewer's in-app view. (Direct URLs / SEO pages stay public by design.)
  // The shell is skipped entirely rather than rendered without a body: its tab
  // row would offer archives the viewer is only going to be redirected out of.
  const restricted = !isOwnProfile && (pageData.viewerHasBlocked || pageData.blockedByProfile);

  if (restricted) {
    return (
      <PageLayout title={t('pageTitle')} locale={locale}>
        <div className="space-y-6">
          <ProfileIdentityHeader viewer={viewer} shell={pageData} locale={locale} restricted />
          <ProfileBlockedNotice
            message={pageData.viewerHasBlocked ? t('blockedNoticeByYou') : t('blockedNoticeByThem')}
          />
        </div>
      </PageLayout>
    );
  }

  const helpSteps: HelpStep[] = [
    {
      targetId: 'profile-tabs',
      title: t('help.archives.title'),
      description: t('help.archives.description'),
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
    <ProfileShell
      context={{ ...viewer, shell: pageData }}
      locale={locale}
      activeTab="timeline"
      titleAction={<HelpTourButton steps={helpSteps} label={t('help.label')} />}
    >
      <div className="mt-4" data-tour-id="profile-timeline">
        <Suspense fallback={<FeedSkeleton />}>
          <ProfileTimeline
            profileId={profile.id}
            username={username}
            locale={locale}
            currentUserId={currentUserId}
          />
        </Suspense>
      </div>
    </ProfileShell>
  );
}
