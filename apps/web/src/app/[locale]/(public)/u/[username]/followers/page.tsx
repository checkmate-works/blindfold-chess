import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { AUTHOR_PROFILE_COLUMNS, db, profiles, userFollows } from '@/lib/db';

import { PageLayout, PaginationNav, UserCard } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

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

  const [profile] = await db
    .select({ displayName: profiles.displayName })
    .from(profiles)
    .where(and(eq(profiles.username, username), isNull(profiles.deletedAt)))
    .limit(1);

  if (!profile) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'publicProfile' });
  const displayName = profile.displayName ?? username;

  return {
    title: resolveTitle(`${t('followersPageTitle')} - ${displayName}`, locale),
    alternates: {
      canonical: `/${locale}/u/${username}/followers`,
    },
  };
}

export default async function FollowersPage({ params, searchParams }: Props) {
  const { locale, username } = await params;

  const [profile] = await db
    .select({ id: profiles.id, displayName: profiles.displayName })
    .from(profiles)
    .where(and(eq(profiles.username, username), isNull(profiles.deletedAt)))
    .limit(1);

  if (!profile) {
    notFound();
  }

  const { page } = await searchParamsCache.parse(searchParams);

  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  const [countResult] = await db
    .select({ count: count() })
    .from(userFollows)
    .innerJoin(profiles, eq(userFollows.followerId, profiles.id))
    .where(and(eq(userFollows.followingId, profile.id), isNull(profiles.deletedAt)));

  const totalCount = countResult.count;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));

  const followerList = await db
    .select({
      ...AUTHOR_PROFILE_COLUMNS,
      id: profiles.id,
    })
    .from(userFollows)
    .innerJoin(profiles, eq(userFollows.followerId, profiles.id))
    .where(and(eq(userFollows.followingId, profile.id), isNull(profiles.deletedAt)))
    .orderBy(desc(userFollows.createdAt))
    .limit(PAGE_SIZE)
    .offset((currentPage - 1) * PAGE_SIZE);

  const displayName = profile.displayName ?? username;

  const buildHref = (p: number) => {
    const qs = p > 1 ? `?page=${p}` : '';
    return `/${locale}/u/${username}/followers${qs}`;
  };

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

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
