import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { EMPTY_REPLY_META } from '@/lib/db/reply-meta-queries';
import { createClient } from '@/lib/supabase/server';

import { PageLayout } from '@/app/[locale]/_components';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ProfileIdentitySection } from '../../_components/ProfileIdentitySection';
import { ProfileTabBar } from '../../_components/ProfileTabBar';
import { buildTabHref } from '../../_lib/build-tab-href';
import { loadProfileShellData } from '../../_lib/load-profile-shell-data';
import { getProfileByUsername } from '../../_lib/queries';
import { loadProblemsPageData } from '../_lib/load-problems-page-data';
import { ProblemPositionList } from './ProblemPositionList';
import { ProblemTypeTabs } from './ProblemTypeTabs';

type ProblemType = 'puzzle' | 'memory';

const PAGE_SIZE = 10;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

type Props = {
  params: Promise<{ locale: Locale; username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const TYPE_ROUTE_SEGMENT: Record<ProblemType, string> = {
  puzzle: 'puzzles',
  memory: 'position-memory',
};

export async function generateProblemsTypeMetadata(
  { params }: Props,
  type: ProblemType
): Promise<Metadata> {
  const { locale, username } = await params;

  const profile = await getProfileByUsername(username);
  if (!profile) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'publicProfile' });
  const displayName = profile.displayName ?? username;
  const typeLabel = type === 'puzzle' ? t('problemTypePuzzle') : t('problemTypeMemory');

  return {
    title: resolveTitle(`${typeLabel} - ${displayName}`, locale),
    alternates: {
      canonical: `/${locale}/u/${username}/problems/${TYPE_ROUTE_SEGMENT[type]}`,
    },
  };
}

export async function ProblemsTypePage({
  params,
  searchParams,
  type,
}: Props & { type: ProblemType }) {
  const { locale, username } = await params;

  const supabase = await createClient();
  const [profile, parsedParams, authResult] = await Promise.all([
    getProfileByUsername(username),
    searchParamsCache.parse(searchParams),
    supabase.auth.getUser(),
  ]);

  if (!profile) {
    notFound();
  }

  const user = authResult.data.user;
  const isOwnProfile = user?.id === profile.id;

  const [shell, problemsData, t, tType] = await Promise.all([
    loadProfileShellData({ profileId: profile.id, currentUserId: user?.id, isOwnProfile }),
    loadProblemsPageData({
      profileId: profile.id,
      currentUserId: user?.id,
      type,
      page: parsedParams.page,
      pageSize: PAGE_SIZE,
    }),
    getTranslations({ locale, namespace: 'publicProfile' }),
    getTranslations({
      locale,
      namespace: type === 'puzzle' ? 'practice.puzzle' : 'practice.positionMemory',
    }),
  ]);

  const buildHref = (p: number) => {
    const qs = p > 1 ? `?page=${p}` : '';
    return `/${locale}/u/${username}/problems/${TYPE_ROUTE_SEGMENT[type]}${qs}`;
  };

  return (
    <PageLayout title={t('pageTitle')} locale={locale}>
      <div className="space-y-6">
        <ProfileIdentitySection
          profile={profile}
          locale={locale}
          isOwnProfile={isOwnProfile}
          isAuthenticated={!!user}
          initialFollowing={shell.initialFollowing}
          followedByProfile={shell.followedByProfile}
          followerCount={shell.followerCount}
          followingCount={shell.followingCount}
          labels={{
            editProfile: t('editProfile'),
            followsYou: t('followsYou'),
            followingCount: t('followingCount'),
            followers: t('followers'),
            bio: t('bio'),
          }}
        />

        <div>
          <ProfileTabBar
            topicsCount={shell.allPosts.length}
            problemsCount={shell.problemsCount}
            gamesCount={shell.gamesCount}
            activeTab="problems"
            locale={locale}
            buildTabHref={(targetTab) => buildTabHref(username, targetTab)}
            labels={{
              topicsTab: t('topicsTab'),
              problemsTab: t('problemsTab'),
              gamesTab: t('gamesTab'),
            }}
          />

          <ProblemTypeTabs
            username={username}
            activeType={type}
            puzzleCount={problemsData.puzzleCount}
            memoryCount={problemsData.memoryCount}
            locale={locale}
            labels={{
              puzzlesTab: t('problemTypePuzzle'),
              positionMemoryTab: t('problemTypeMemory'),
            }}
          />

          <ProblemPositionList
            type={type}
            positions={problemsData.positions}
            authorProfile={{
              username: profile.username,
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl,
            }}
            likeMetaMap={problemsData.likeMetaMap}
            replyMetaMap={problemsData.replyMetaMap}
            emptyReplyMeta={EMPTY_REPLY_META}
            currentPage={problemsData.currentPage}
            totalPages={problemsData.totalPages}
            locale={locale}
            buildHref={buildHref}
            justNowLabel={tType('justNow')}
            labels={{ noProblems: t('noProblems') }}
          />
        </div>
      </div>
    </PageLayout>
  );
}
