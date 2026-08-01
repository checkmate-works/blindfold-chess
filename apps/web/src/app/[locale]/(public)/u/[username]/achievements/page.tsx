import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getAchievementCategoryNames } from '@/lib/achievements/display';
import { countTotalEarned, getUserAchievementGroups } from '@/lib/db/achievement-queries';

import { PageLayout } from '@/app/[locale]/_components';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ProfileAchievements } from '../_components/ProfileAchievements';
import { getProfileByUsername } from '../_lib/queries';
import { redirectIfBlockedFromProfile } from '../_lib/redirect-if-blocked';

// Per-user, per-locale URLs explode the on-demand ISR cache (one entry per
// (locale, username)), and the 5-min revalidate cycle previously triggered ISR
// Writes on every bot/user revisit. Render dynamically instead — the parent
// /u/[username]/page.tsx already does the same.
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: Locale; username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, username } = await params;

  const profile = await getProfileByUsername(username);

  if (!profile) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'publicProfile' });
  const displayName = profile.displayName ?? username;

  return {
    title: resolveTitle(`${t('achievementsPageTitle')} - ${displayName}`, locale),
    alternates: {
      canonical: `/${locale}/u/${username}/achievements`,
    },
  };
}

/**
 * Every achievement a user holds, one card per badge definition.
 *
 * Deliberately unpaginated: the list is grouped by badge definition, so its
 * length is bounded by the seeded definitions (42 as of writing) rather than
 * by how many months the user has been placing on leaderboards.
 */
export default async function AchievementsPage({ params }: Props) {
  const { locale, username } = await params;

  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  await redirectIfBlockedFromProfile({ locale, username, profileId: profile.id });

  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  const achievements = await getUserAchievementGroups(profile.id);

  const displayName = profile.displayName ?? username;

  return (
    <PageLayout
      title={t('achievementsPageTitle')}
      locale={locale}
      breadcrumb={[
        { label: displayName, href: `/u/${username}` },
        { label: t('achievementsPageTitle') },
      ]}
    >
      <ProfileAchievements
        achievements={achievements}
        locale={locale}
        totalCount={countTotalEarned(achievements)}
        labels={{
          sectionTitle: t('achievementsSection'),
          noAchievements: t('noAchievements'),
          categoryNames: getAchievementCategoryNames(t),
        }}
      />
    </PageLayout>
  );
}
