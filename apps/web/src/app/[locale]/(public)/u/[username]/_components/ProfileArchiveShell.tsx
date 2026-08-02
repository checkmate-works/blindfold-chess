import { getTranslations } from 'next-intl/server';

import { PageLayout } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { ProfileArchiveContext } from '../_lib/load-archive-context';
import type { ProfileArchive } from '../_lib/profile-archive-href';
import { ProfileIdentityHeader } from './ProfileIdentityHeader';
import { ProfileTabBar } from './ProfileTabBar';

type Props = {
  context: ProfileArchiveContext;
  locale: Locale;
  /** Which top-level tab this archive page represents. */
  activeTab: ProfileArchive;
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
  const { profile, shell } = context;
  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  return (
    <PageLayout title={t('pageTitle')} locale={locale}>
      <div className="space-y-6">
        <ProfileIdentityHeader viewer={context} shell={shell} locale={locale} />

        <div>
          <ProfileTabBar
            username={profile.username}
            topicsCount={shell.postsCount}
            problemsCount={shell.problemsCount}
            gamesCount={shell.gamesCount}
            activeTab={activeTab}
            locale={locale}
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
