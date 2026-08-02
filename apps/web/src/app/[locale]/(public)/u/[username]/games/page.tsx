/**
 * Profile Games Archive (公開ゲームアーカイブ)
 *
 * @description
 * The complete, paginated list of one member's publicly-shared games. Split
 * out of the main profile page alongside `/posts` — see that page's TSDoc for
 * why the archives, not the timeline, carry the page-numbered links.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { type SharedGameListItem, listGamesByAuthorId } from '@/lib/db/games-read';
import { GAME_LIKE_TARGET, type LikeMeta, getLikeMetaMap } from '@/lib/db/like-queries';
import {
  EMPTY_REPLY_META,
  type ReplyMeta,
  getGameCommentMetaMap,
} from '@/lib/db/reply-meta-queries';

import { getOpeningDisplayName } from '@/app/[locale]/(public)/topics/openings/_lib/get-opening-display-name';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ProfileArchiveShell } from '../_components/ProfileArchiveShell';
import { ProfileGames } from '../_components/ProfileGames';
import { buildProfileArchiveMetadata } from '../_lib/archive-metadata';
import { loadProfileArchiveContext } from '../_lib/load-archive-context';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 5;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

type Props = {
  params: Promise<{ locale: Locale; username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, username } = await params;

  return buildProfileArchiveMetadata({ locale, username, labelKey: 'gamesTab', segment: 'games' });
}

export default async function ProfileGamesPage({ params, searchParams }: Props) {
  const { locale, username } = await params;

  const [context, parsedParams, t, tPlay, tSharedGames, tOpeningNames] = await Promise.all([
    loadProfileArchiveContext({ locale, username }),
    searchParamsCache.parse(searchParams),
    getTranslations({ locale, namespace: 'publicProfile' }),
    getTranslations({ locale, namespace: 'play' }),
    getTranslations({ locale, namespace: 'sharedGames' }),
    getTranslations({ locale, namespace: 'topics.openings.names' }),
  ]);

  const totalPages = Math.ceil(context.shell.gamesCount / PAGE_SIZE);
  const currentPage = Math.max(1, Math.min(parsedParams.page, totalPages || 1));

  let games: SharedGameListItem[] = [];
  let likeMetaMap: Map<string, LikeMeta> = new Map();
  let replyMetaMap: Map<string, ReplyMeta> = new Map();

  if (context.shell.gamesCount > 0) {
    games = await listGamesByAuthorId(context.profile.id, PAGE_SIZE, (currentPage - 1) * PAGE_SIZE);

    const gameIds = games.map((g) => g.id);
    [likeMetaMap, replyMetaMap] = await Promise.all([
      getLikeMetaMap(GAME_LIKE_TARGET, gameIds, context.currentUserId),
      getGameCommentMetaMap(gameIds),
    ]);
  }

  const buildHref = (p: number) => `/${locale}/u/${username}/games${p > 1 ? `?page=${p}` : ''}`;

  return (
    <ProfileArchiveShell context={context} locale={locale} activeTab="games">
      <ProfileGames
        games={games}
        likeMetaMap={likeMetaMap}
        replyMetaMap={replyMetaMap}
        emptyReplyMeta={EMPTY_REPLY_META}
        currentPage={currentPage}
        totalPages={totalPages}
        locale={locale}
        buildHref={buildHref}
        justNowLabel={tSharedGames('detail.justNow')}
        colorLabels={{
          white: tPlay('playerColor.white'),
          black: tPlay('playerColor.black'),
        }}
        resolveOpeningName={(slug, fallbackName) =>
          getOpeningDisplayName(tOpeningNames, slug, fallbackName)
        }
        labels={{ noGames: t('noGames') }}
      />
    </ProfileArchiveShell>
  );
}
