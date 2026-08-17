import type { ReactNode } from 'react';

import { getStartingFen } from '@blindfold-chess/features/chess-core';

import type { SharedGameListItem } from '@/lib/db/games-read';
import type { LikeMeta } from '@/lib/db/like-queries';
import type { ReplyMeta } from '@/lib/db/reply-meta-queries';

import { CatalogListCard } from '@/app/[locale]/_components/CatalogListCard';
import type { Locale } from '@/app/[locale]/_lib/types';

import { toggleGameLikeAction } from '../[id]/_actions/game-like';
import { AiReviewedBadge } from './AiReviewedBadge';
import { GameColorOpeningRow } from './GameColorOpeningRow';

const EMPTY_LIKE_META: LikeMeta = { likeCount: 0, likedByMe: false };

type Props = {
  game: SharedGameListItem;
  likeMeta: LikeMeta | undefined;
  replyMeta: ReplyMeta;
  reviewed: boolean;
  aiReviewedBadgeLabel: string;
  colorLabels: { white: string; black: string };
  /** Localised opening name for a (slug, fallback name) pair. */
  resolveOpeningName: (slug: string, name: string) => string;
  justNowLabel: string;
  locale: Locale;
  /** Rendered under the colour/opening row — the chunk list adds ply chips. */
  extraMeta?: ReactNode;
};

/**
 * One published game as a row in a list.
 *
 * Three lists rendered this: the public `/games/shared` index, a profile's
 * games tab, and a chunk's related games. All three passed the same seventeen
 * props to `CatalogListCard`, including the same `#game-overview` hash and the
 * comment explaining it. Only the chunk list adds anything of its own, and it
 * adds it below the shared meta row — hence `extraMeta` rather than a flag.
 */
export function SharedGameListCard({
  game,
  likeMeta,
  replyMeta,
  reviewed,
  aiReviewedBadgeLabel,
  colorLabels,
  resolveOpeningName,
  justNowLabel,
  locale,
  extraMeta,
}: Props) {
  const meta = (
    <>
      <GameColorOpeningRow
        playerColor={game.playerColor}
        colorLabel={game.playerColor === 'white' ? colorLabels.white : colorLabels.black}
        opening={game.opening}
        openingDisplayName={
          game.opening ? resolveOpeningName(game.opening.slug, game.opening.name) : undefined
        }
        locale={locale}
      />
      {extraMeta}
    </>
  );

  return (
    <CatalogListCard
      id={game.id}
      fen={game.startingFen ?? getStartingFen()}
      thumbnailDisplaySettings={game.thumbnailDisplay}
      title={game.title}
      description={game.description}
      createdAt={game.createdAt}
      profile={game.author}
      likeMeta={likeMeta ?? EMPTY_LIKE_META}
      replyMeta={replyMeta}
      detailHref={`/games/shared/${game.id}`}
      // GameReview's own hash handler scrolls to #game-overview, not the
      // generic #comments id — see GameFeedCard's home-feed equivalent.
      commentHref={`/games/shared/${game.id}#game-overview`}
      i18nNamespace="sharedGames.detail"
      toggleLikeAction={toggleGameLikeAction}
      justNowLabel={justNowLabel}
      locale={locale}
      topicKey=""
      badge={<AiReviewedBadge reviewed={reviewed} label={aiReviewedBadgeLabel} />}
      meta={meta}
    />
  );
}
