import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { getAchievementCategoryNames } from '@/lib/achievements/display';
import {
  getUserAchievementCount,
  getUserAchievementsPaginated,
} from '@/lib/db/achievement-queries';

import { PageLayout } from '@/app/[locale]/_components';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ProfileAchievements } from '../_components/ProfileAchievements';
import { getProfileByUsername } from '../_lib/queries';
import { redirectIfBlockedFromProfile } from '../_lib/redirect-if-blocked';

// Per-user, per-locale URLs explode the on-demand ISR cache (one entry per
// (locale, username, ?page=N)), and the 5-min revalidate cycle previously
// triggered ISR Writes on every bot/user revisit. Render dynamically instead —
// the parent /u/[username]/page.tsx already does the same.
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 10;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
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
  const displayName = profile.displayName ?? username;

  return {
    title: resolveTitle(`${t('achievementsPageTitle')} - ${displayName}`, locale),
    alternates: {
      canonical: `/${locale}/u/${username}/achievements`,
    },
  };
}

export default async function AchievementsPage({ params, searchParams }: Props) {
  const { locale, username } = await params;

  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  await redirectIfBlockedFromProfile({ locale, username, profileId: profile.id });

  const { page } = await searchParamsCache.parse(searchParams);

  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  const totalCount = await getUserAchievementCount(profile.id);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));

  const achievements = await getUserAchievementsPaginated(profile.id, {
    limit: PAGE_SIZE,
    offset: (currentPage - 1) * PAGE_SIZE,
  });

  const displayName = profile.displayName ?? username;

  const buildHref = (p: number) => {
    const qs = p > 1 ? `?page=${p}` : '';
    return `/${locale}/u/${username}/achievements${qs}`;
  };

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
        totalCount={totalCount}
        labels={{
          sectionTitle: t('achievementsSection'),
          noAchievements: t('noAchievements'),
          categoryNames: getAchievementCategoryNames(t),
        }}
      />

      <PaginationNav
        locale={locale}
        currentPage={currentPage}
        totalPages={totalPages}
        buildHref={buildHref}
      />
    </PageLayout>
  );
}
