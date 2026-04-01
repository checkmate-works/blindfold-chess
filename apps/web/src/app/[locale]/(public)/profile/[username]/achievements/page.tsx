import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { getAchievementCategoryNames } from '@/lib/achievements/display';
import {
  getUserAchievementCount,
  getUserAchievementsPaginated,
} from '@/lib/db/achievement-queries';

import { Divider, PagePanel, PageTitle, PaginationNav } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ProfileAchievements } from '../_components/ProfileAchievements';
import { getProfileByUsername } from '../_lib/queries';

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
    title: `${t('achievementsPageTitle')} - ${displayName}`,
    alternates: {
      canonical: `/${locale}/@/${username}/achievements`,
    },
  };
}

export default async function AchievementsPage({ params, searchParams }: Props) {
  const { locale, username } = await params;

  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }

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
    return `/${locale}/@/${username}/achievements${qs}`;
  };

  return (
    <div className="space-y-8">
      <PageTitle>{t('achievementsPageTitle')}</PageTitle>
      <PagePanel>
        <ProfileAchievements
          achievements={achievements}
          locale={locale}
          totalCount={totalCount}
          labels={{
            sectionTitle: t('achievementsSection'),
            noAchievements: t('noAchievements'),
            achievedOn: t('achievedOn'),
            categoryNames: getAchievementCategoryNames(t),
          }}
        />

        <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />

        <Divider />

        <Breadcrumb
          locale={locale}
          items={[
            { label: displayName, href: `/@/${username}` },
            { label: t('achievementsPageTitle') },
          ]}
        />
      </PagePanel>
    </div>
  );
}
