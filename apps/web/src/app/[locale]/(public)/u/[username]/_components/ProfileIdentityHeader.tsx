import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { ProfileViewer } from '../_lib/load-archive-context';
import type { ProfileShellData } from '../_lib/load-profile-shell-data';
import { ProfileIdentitySection } from './ProfileIdentitySection';

type Props = {
  viewer: ProfileViewer;
  shell: ProfileShellData;
  locale: Locale;
  /** A block exists in either direction — collapse to a bare identity header. */
  restricted?: boolean;
};

/**
 * `ProfileIdentitySection` wired to the profile page's data and copy.
 *
 * Exists because that section takes nine props plus a nine-key `labels`
 * object, and every page under `/u/[username]` renders it identically: the
 * timeline, the three archives, and anything added later. Spelling the
 * wiring out per page meant a new label had to be added in each of them, and
 * a missed one is invisible — the page simply loses a string.
 */
export async function ProfileIdentityHeader({ viewer, shell, locale, restricted }: Props) {
  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  return (
    <ProfileIdentitySection
      profile={viewer.profile}
      locale={locale}
      isOwnProfile={viewer.isOwnProfile}
      isAuthenticated={!!viewer.currentUserId}
      initialFollowing={shell.initialFollowing}
      followedByProfile={shell.followedByProfile}
      viewerHasBlocked={shell.viewerHasBlocked}
      restricted={restricted}
      followerCount={shell.followerCount}
      followingCount={shell.followingCount}
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
  );
}
