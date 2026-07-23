import { Link } from '@/i18n/routing';
import { FiEdit2, FiSlash } from 'react-icons/fi';

import { LinkedText } from '@/app/[locale]/_components';
import { ActionsMenu } from '@/app/[locale]/_components/ActionsMenu';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import { FollowButton } from './FollowButton';
import { ProfileHeader } from './ProfileHeader';
import { SocialLinks } from './SocialLinks';

type ProfileForIdentity = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  flair: string | null;
  country: string | null;
  bio: string | null;
  fideId: string | null;
  chesscomUsername: string | null;
  lichessUsername: string | null;
  xUsername: string | null;
  instagramUsername: string | null;
  youtubeHandle: string | null;
};

type Props = {
  profile: ProfileForIdentity;
  locale: Locale;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
  initialFollowing: boolean;
  followedByProfile: boolean;
  viewerHasBlocked: boolean;
  /**
   * A block exists in either direction. Collapses the profile to a bare
   * identity header (no follow control, stats, social links, or bio) — the
   * page renders a "content hidden" notice in place of the tabs.
   */
  restricted?: boolean;
  followerCount: number;
  followingCount: number;
  labels: {
    editProfile: string;
    followsYou: string;
    followingCount: string;
    followers: string;
    bio: string;
    moreActions: string;
    block: string;
    unblock: string;
    blockedBadge: string;
  };
};

/**
 * Avatar/header + follow stats + social links + bio block shared by the main
 * profile page and the `/problems/{puzzles,position-memory}` sub-pages, so
 * the profile identity reads the same regardless of which tab is active.
 */
export function ProfileIdentitySection({
  profile,
  locale,
  isOwnProfile,
  isAuthenticated,
  initialFollowing,
  followedByProfile,
  viewerHasBlocked,
  restricted = false,
  followerCount,
  followingCount,
  labels,
}: Props) {
  return (
    <>
      <ProfileHeader
        avatarUrl={profile.avatarUrl}
        username={profile.username}
        displayName={profile.displayName}
        flair={profile.flair}
        country={profile.country}
        locale={locale}
        action={
          isOwnProfile ? (
            <ActionsMenu
              ariaLabel={labels.moreActions}
              items={[
                {
                  key: 'edit',
                  label: labels.editProfile,
                  href: `/${locale}/mypage/profile`,
                  icon: <FiEdit2 className="h-4 w-4" aria-hidden />,
                },
              ]}
            />
          ) : (
            <>
              {viewerHasBlocked && (
                <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground mr-3 sm:mr-0">
                  {labels.blockedBadge}
                </span>
              )}
              {!restricted && followedByProfile && (
                <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground mr-3 sm:mr-0">
                  {labels.followsYou}
                </span>
              )}
              {/* A block (either direction) severs the follow graph, so Follow is hidden. */}
              {!restricted && (
                <FollowButton
                  targetUsername={profile.username}
                  locale={locale}
                  initialFollowing={initialFollowing}
                  isAuthenticated={isAuthenticated}
                />
              )}
              {isAuthenticated && (
                <ActionsMenu
                  ariaLabel={labels.moreActions}
                  items={[
                    {
                      key: 'block',
                      label: viewerHasBlocked ? labels.unblock : labels.block,
                      href: `/${locale}/u/${profile.username}/block`,
                      icon: <FiSlash className="h-4 w-4" aria-hidden />,
                    },
                  ]}
                />
              )}
            </>
          )
        }
      />

      {!restricted && (
        <>
          <p className="text-sm text-muted-foreground">
            {isOwnProfile && (
              <>
                <Link href="/mypage/following" locale={locale} className={TEXT_LINK_CLASSES}>
                  <span className="font-semibold text-foreground">{followingCount}</span>{' '}
                  {labels.followingCount}
                </Link>
                <span className="mx-2" />
              </>
            )}
            <Link
              href={`/u/${profile.username}/followers`}
              locale={locale}
              className={TEXT_LINK_CLASSES}
            >
              <span className="font-semibold text-foreground">{followerCount}</span>{' '}
              {labels.followers}
            </Link>
          </p>

          <SocialLinks
            fideId={profile.fideId}
            chesscomUsername={profile.chesscomUsername}
            lichessUsername={profile.lichessUsername}
            xUsername={profile.xUsername}
            instagramUsername={profile.instagramUsername}
            youtubeHandle={profile.youtubeHandle}
          />

          {profile.bio && (
            <div className="space-y-3">
              <h2 className="text-base md:text-lg font-medium border-b border-border pb-2 leading-normal">
                {labels.bio}
              </h2>
              <p className="text-foreground whitespace-pre-wrap break-words">
                <LinkedText text={profile.bio} locale={locale} />
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}
