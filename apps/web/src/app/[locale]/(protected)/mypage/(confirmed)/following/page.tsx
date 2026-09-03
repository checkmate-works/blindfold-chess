import { getTranslations } from 'next-intl/server';

import { and, count, desc, eq } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { getAuthenticatedUser } from '@/lib/auth';
import { AUTHOR_PROFILE_COLUMNS, db, profiles, userFollows } from '@/lib/db';
import { profileNotDeleted } from '@/lib/db/profile-not-deleted';
import { buildPageHref, resolvePagination } from '@/lib/pagination';

import { PageLayout } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps } from '@/app/[locale]/_lib/types';

import { FollowingList } from './_components/FollowingList';

const PAGE_SIZE = 10;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

type Props = LocaleSearchPageProps;

export function generateMetadata({ params }: Props) {
  return createPageMetadata({
    params,
    namespace: 'metadata.mypageFollowing',
    path: 'mypage/following',
    noIndex: true,
  });
}

export default async function FollowingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypageFollowing' });

  const user = await getAuthenticatedUser();

  const { page } = await searchParamsCache.parse(searchParams);

  const [countResult] = await db
    .select({ count: count() })
    .from(userFollows)
    .where(and(eq(userFollows.followerId, user.id), profileNotDeleted(userFollows.followingId)));

  const totalCount = countResult.count;
  const { currentPage, totalPages, offset } = resolvePagination(page, totalCount, PAGE_SIZE);

  const followingList = await db
    .select({
      ...AUTHOR_PROFILE_COLUMNS,
      id: profiles.id,
    })
    .from(userFollows)
    .innerJoin(profiles, eq(userFollows.followingId, profiles.id))
    // The filter is the helper rather than the join's `isNull(profiles.deletedAt)`
    // so this list and the count above apply one predicate. The two spellings do
    // not always agree, and a count that outruns its list is a pager offering a
    // page with nothing on it. See the helper's `@design` note for why its form
    // is also the cheaper one.
    .where(and(eq(userFollows.followerId, user.id), profileNotDeleted(userFollows.followingId)))
    .orderBy(desc(userFollows.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset);

  const buildHref = buildPageHref(`/${locale}/mypage/following`);

  return (
    <PageLayout
      title={t('title')}
      locale={locale}
      breadcrumb={[{ label: t('breadcrumbMypage'), href: '/mypage' }, { label: t('title') }]}
    >
      <FollowingList initialList={followingList} locale={locale} />

      <PaginationNav
        currentPage={currentPage}
        totalPages={totalPages}
        buildHref={buildHref}
        locale={locale}
      />

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
