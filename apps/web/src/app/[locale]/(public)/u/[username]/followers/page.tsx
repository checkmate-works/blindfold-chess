import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { getOptionalUser } from '@/lib/auth';
import { buildPageHref, resolvePagination } from '@/lib/pagination';

import { PageLayout, UserCard } from '@/app/[locale]/_components';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import type { Locale } from '@/app/[locale]/_lib/types';

import { buildProfileArchiveMetadata } from '../_lib/archive-metadata';
import { getProfileByUsername } from '../_lib/queries';
import { redirectIfBlockedFromProfile } from '../_lib/redirect-if-blocked';
import { countVisibleFollowers, listVisibleFollowers } from './_lib/queries';

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
  return buildProfileArchiveMetadata({
    locale,
    username,
    labelKey: 'followersPageTitle',
    segment: 'followers',
  });
}

export default async function FollowersPage({ params, searchParams }: Props) {
  const { locale, username } = await params;

  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  // The block check and the follower count are both keyed on the profile row
  // only; a redirect thrown by the check wins over the discarded count. The
  // viewer is resolved first because the count leaves out the followers they
  // are in a block with; `getOptionalUser` is request-cached, so the check's
  // own lookup reuses it.
  const viewer = await getOptionalUser();
  const [, { page }, t, totalCount] = await Promise.all([
    redirectIfBlockedFromProfile({ locale, username, profileId: profile.id }),
    searchParamsCache.parse(searchParams),
    getTranslations({ locale, namespace: 'publicProfile' }),
    countVisibleFollowers(profile.id, viewer?.id),
  ]);

  const { currentPage, totalPages, offset } = resolvePagination(page, totalCount, PAGE_SIZE);

  const followerList = await listVisibleFollowers(profile.id, viewer?.id, {
    limit: PAGE_SIZE,
    offset,
  });

  const displayName = profile.displayName || username;

  const buildHref = buildPageHref(`/${locale}/u/${username}/followers`);

  return (
    <PageLayout
      title={t('followersPageTitle')}
      locale={locale}
      breadcrumb={[
        { label: displayName, href: `/u/${username}` },
        { label: t('followersPageTitle') },
      ]}
    >
      {followerList.length === 0 ? (
        <p className="text-muted-foreground">{t('noFollowers')}</p>
      ) : (
        <div className="space-y-3">
          {followerList.map((user) => (
            <UserCard
              key={user.id}
              username={user.username}
              displayName={user.displayName}
              avatarUrl={user.avatarUrl}
              locale={locale}
            />
          ))}
        </div>
      )}

      <PaginationNav
        locale={locale}
        currentPage={currentPage}
        totalPages={totalPages}
        buildHref={buildHref}
      />
    </PageLayout>
  );
}
