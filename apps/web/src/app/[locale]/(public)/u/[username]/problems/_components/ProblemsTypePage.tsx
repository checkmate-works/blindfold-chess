import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { EMPTY_REPLY_META } from '@/lib/db/reply-meta-queries';
import { buildPageHref } from '@/lib/pagination';
import type { PositionKind } from '@/lib/positions/kind';

import type { Locale } from '@/app/[locale]/_lib/types';

import { ProfileShell } from '../../_components/ProfileShell';
import { buildProfileArchiveMetadata } from '../../_lib/archive-metadata';
import { loadProfileArchiveContext, resolveProfileViewer } from '../../_lib/load-archive-context';
import { loadProblemsPageData } from '../_lib/load-problems-page-data';
import { ProblemPositionList } from './ProblemPositionList';
import { ProblemTypeTabs } from './ProblemTypeTabs';

const PAGE_SIZE = 10;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

type Props = {
  params: Promise<{ locale: Locale; username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const TYPE_ROUTE_SEGMENT: Record<PositionKind, string> = {
  puzzle: 'puzzles',
  memory: 'position-memory',
};

export async function generateProblemsTypeMetadata(
  { params }: Props,
  type: PositionKind
): Promise<Metadata> {
  const { locale, username } = await params;

  return buildProfileArchiveMetadata({
    locale,
    username,
    labelKey: type === 'puzzle' ? 'problemTypePuzzle' : 'problemTypeMemory',
    segment: `problems/${TYPE_ROUTE_SEGMENT[type]}`,
  });
}

export async function ProblemsTypePage({
  params,
  searchParams,
  type,
}: Props & { type: PositionKind }) {
  const { locale, username } = await params;

  // The viewer resolves first (both of its lookups are `React.cache`d) so the
  // problems query can start alongside the shell load rather than after it.
  const [viewer, parsedParams] = await Promise.all([
    resolveProfileViewer(username),
    searchParamsCache.parse(searchParams),
  ]);

  const [context, problemsData, t, tType] = await Promise.all([
    loadProfileArchiveContext({ locale, username }),
    loadProblemsPageData({
      profileId: viewer.profile.id,
      currentUserId: viewer.currentUserId,
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

  const buildHref = buildPageHref(`/${locale}/u/${username}/problems/${TYPE_ROUTE_SEGMENT[type]}`);

  return (
    <ProfileShell context={context} locale={locale} activeTab="problems">
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
          username: context.profile.username,
          displayName: context.profile.displayName,
          avatarUrl: context.profile.avatarUrl,
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
    </ProfileShell>
  );
}
