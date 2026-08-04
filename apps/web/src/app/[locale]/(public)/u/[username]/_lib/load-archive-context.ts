import { notFound, redirect } from 'next/navigation';

import { getOptionalUser } from '@/lib/auth';

import type { Locale } from '@/app/[locale]/_lib/types';

import { type ProfileShellData, loadProfileShellData } from './load-profile-shell-data';
import { getProfileByUsername } from './queries';

type ProfileRow = NonNullable<Awaited<ReturnType<typeof getProfileByUsername>>>;

export type ProfileViewer = {
  profile: ProfileRow;
  /** The viewer, for per-viewer meta (like state). `undefined` when anonymous. */
  currentUserId: string | undefined;
  isOwnProfile: boolean;
};

export type ProfileArchiveContext = ProfileViewer & {
  shell: ProfileShellData;
};

/**
 * Who is being viewed, and by whom. Both lookups are `React.cache`d, so a page
 * may call this to get the profile id it needs for its own queries and still
 * let {@link loadProfileArchiveContext} run in parallel — the second call
 * costs nothing.
 *
 * Throws (via `notFound`) for an unknown username, so callers can treat the
 * returned profile as present.
 */
export async function resolveProfileViewer(username: string): Promise<ProfileViewer> {
  const [profile, user] = await Promise.all([getProfileByUsername(username), getOptionalUser()]);

  if (!profile) {
    notFound();
  }

  return {
    profile,
    currentUserId: user?.id,
    isOwnProfile: user?.id === profile.id,
  };
}

/**
 * Resolve everything the three archive pages (`/posts`, `/games`,
 * `/problems/*`) need before they render: the profile, the viewer, and the
 * shared shell data behind the identity header and tab bar.
 *
 * Unlike the main profile page, an archive page has no restricted view of its
 * own — a block in either direction sends the viewer back to the main profile,
 * which owns the single "content hidden" notice. The check reuses the block
 * flags the shell already loaded rather than re-querying like
 * {@link redirectIfBlockedFromProfile}, which exists for the sub-pages that
 * don't load shell data at all.
 */
export async function loadProfileArchiveContext({
  locale,
  username,
}: {
  locale: Locale;
  username: string;
}): Promise<ProfileArchiveContext> {
  const viewer = await resolveProfileViewer(username);

  const shell = await loadProfileShellData({
    profileId: viewer.profile.id,
    currentUserId: viewer.currentUserId,
    isOwnProfile: viewer.isOwnProfile,
  });

  if (!viewer.isOwnProfile && (shell.viewerHasBlocked || shell.blockedByProfile)) {
    redirect(`/${locale}/u/${username}`);
  }

  return { ...viewer, shell };
}
