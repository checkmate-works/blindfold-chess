import { getTranslations } from 'next-intl/server';

import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { getAuthenticatedUser } from '@/lib/auth';
import { AUTHOR_PROFILE_COLUMNS, db, profiles, userFollows } from '@/lib/db';

import { PageLayout, PaginationNav } from '@/app/[locale]/_components';
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
    .innerJoin(profiles, eq(userFollows.followingId, profiles.id))
    .where(and(eq(userFollows.followerId, user.id), isNull(profiles.deletedAt)));

  const totalCount = countResult.count;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));

  const followingList = await db
    .select({
      ...AUTHOR_PROFILE_COLUMNS,
      id: profiles.id,
    })
    .from(userFollows)
    .innerJoin(profiles, eq(userFollows.followingId, profiles.id))
    .where(and(eq(userFollows.followerId, user.id), isNull(profiles.deletedAt)))
    .orderBy(desc(userFollows.createdAt))
    .limit(PAGE_SIZE)
    .offset((currentPage - 1) * PAGE_SIZE);

  const buildHref = (p: number) => {
    const qs = p > 1 ? `?page=${p}` : '';
    return `/${locale}/mypage/following${qs}`;
  };

  return (
    <PageLayout
      title={t('title')}
      locale={locale}
      breadcrumb={[{ label: t('breadcrumbMypage'), href: '/mypage' }, { label: t('title') }]}
    >
      <FollowingList initialList={followingList} locale={locale} />

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </PageLayout>
  );
}
