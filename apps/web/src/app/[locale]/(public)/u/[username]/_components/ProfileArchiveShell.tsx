import { getTranslations } from 'next-intl/server';

import { PageLayout } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { buildTabHref } from '../_lib/build-tab-href';
import type { ProfileArchiveContext } from '../_lib/load-archive-context';
import { ProfileIdentitySection } from './ProfileIdentitySection';
import { ProfileTabBar } from './ProfileTabBar';

type Props = {
  context: ProfileArchiveContext;
  locale: Locale;
  /** Which top-level tab this archive page represents. */
  activeTab: 'topics' | 'problems' | 'games';
  children: React.ReactNode;
};

/**
 * Page chrome shared by the three archive pages — identity header plus the
 * top-level tab row — so a member's identity and the tab counts read
 * identically no matter which archive is open.
 *
 * The main profile page deliberately does NOT use this: it is the timeline,
 * and carries a stats band and filter chips in place of the tab row. The tab
 * row is what ties the archives together, so it lives here rather than in a
 * layout shared with the timeline.
 */
export async function ProfileArchiveShell({ context, locale, activeTab, children }: Props) {
  const { profile, isOwnProfile, shell } = context;
  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  return (
    <PageLayout title={t('pageTitle')} locale={locale}>
      <div className="space-y-6">
        <ProfileIdentitySection
          profile={profile}
          locale={locale}
          isOwnProfile={isOwnProfile}
          isAuthenticated={!!context.currentUserId}
          initialFollowing={shell.initialFollowing}
          followedByProfile={shell.followedByProfile}
          viewerHasBlocked={shell.viewerHasBlocked}
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

        <div>
          <ProfileTabBar
            topicsCount={shell.allPosts.length}
            problemsCount={shell.problemsCount}
            gamesCount={shell.gamesCount}
            activeTab={activeTab}
            locale={locale}
            buildTabHref={(targetTab) => buildTabHref(profile.username, targetTab)}
            labels={{
              topicsTab: t('topicsTab'),
              problemsTab: t('problemsTab'),
              gamesTab: t('gamesTab'),
            }}
          />

          {children}
        </div>
      </div>
    </PageLayout>
  );
}
