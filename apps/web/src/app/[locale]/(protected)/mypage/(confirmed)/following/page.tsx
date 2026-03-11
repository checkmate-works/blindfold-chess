import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { and, count, eq, isNull } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { db, follows, profiles } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

import {
  Breadcrumb,
  Divider,
  PagePanel,
  PageTitle,
  PaginationNav,
} from '@/app/[locale]/_components';

import { FollowingList } from './_components/FollowingList';

const PAGE_SIZE = 5;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.mypageFollowing' });

  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

export default async function FollowingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypageFollowing' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { page } = await searchParamsCache.parse(searchParams);

  const [countResult] = await db
    .select({ count: count() })
    .from(follows)
    .innerJoin(profiles, eq(follows.followingId, profiles.id))
    .where(and(eq(follows.followerId, user!.id), isNull(profiles.deletedAt)));

  const totalCount = countResult.count;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));

  const followingList = await db
    .select({
      id: profiles.id,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(follows)
    .innerJoin(profiles, eq(follows.followingId, profiles.id))
    .where(and(eq(follows.followerId, user!.id), isNull(profiles.deletedAt)))
    .limit(PAGE_SIZE)
    .offset((currentPage - 1) * PAGE_SIZE);

  const buildHref = (p: number) => {
    const qs = p > 1 ? `?page=${p}` : '';
    return `/${locale}/mypage/following${qs}`;
  };

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>
      <PagePanel>
        <FollowingList initialList={followingList} locale={locale} />

        <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />

        <Divider />

        <Breadcrumb
          locale={locale}
          items={[{ label: t('breadcrumbMypage'), href: '/mypage' }, { label: t('title') }]}
        />
      </PagePanel>
    </div>
  );
}
