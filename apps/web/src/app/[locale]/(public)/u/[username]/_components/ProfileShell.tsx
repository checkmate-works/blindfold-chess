import { getTranslations } from 'next-intl/server';

import { PageLayout } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { ProfileArchiveContext } from '../_lib/load-archive-context';
import type { ProfileArchive } from '../_lib/profile-archive-href';
import { ProfileIdentityHeader } from './ProfileIdentityHeader';
import { ProfileStatsBand } from './ProfileStatsBand';
import { ProfileTabBar } from './ProfileTabBar';

type Props = {
  context: ProfileArchiveContext;
  locale: Locale;
  /** Which top-level tab this page represents. */
  activeTab: 'timeline' | ProfileArchive;
  /** Passed through to `PageLayout` (the timeline's help-tour button). */
  titleAction?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Page skeleton shared by every page under `/u/[username]` — the timeline and
 * the three archives: identity header, the rank/achievement band, and the
 * top-level tab row, with the page's own body beneath.
 *
 * Drawing all three in one place is what makes the same member read as the
 * same person on every page. They used to diverge: the archives carried the
 * tab row and no band, while the timeline carried the band and a row of filter
 * chips in the tab row's position — so the two halves of one profile looked
 * like separate sites.
 */
export async function ProfileShell({ context, locale, activeTab, titleAction, children }: Props) {
  const { profile, shell } = context;
  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  return (
    <PageLayout title={t('pageTitle')} locale={locale} titleAction={titleAction}>
      <div className="space-y-6">
        <ProfileIdentityHeader viewer={context} shell={shell} locale={locale} />

        <ProfileStatsBand
          username={profile.username}
          locale={locale}
          rankSlug={shell.rankSlug}
          achievements={shell.userAchievementGroups}
        />

        <div>
          <div data-tour-id="profile-tabs">
            <ProfileTabBar
              username={profile.username}
              topicsCount={shell.postsCount}
              problemsCount={shell.problemsCount}
              gamesCount={shell.gamesCount}
              activeTab={activeTab}
              locale={locale}
              labels={{
                timelineTab: t('timelineTab'),
                topicsTab: t('topicsTab'),
                problemsTab: t('problemsTab'),
                gamesTab: t('gamesTab'),
              }}
            />
          </div>

          {children}
        </div>
      </div>
    </PageLayout>
  );
}
