/**
 * Timeline Feed Type Definitions
 *
 * @design Polymorphic entity pattern (entityType + entityId)
 * Feed items use a discriminated union keyed by `entityType`. Each variant
 * carries a `data` payload whose shape differs per entity type. This mirrors
 * the polymorphic target pattern used by `user_activity_log` and
 * `moderation_actions` elsewhere in the codebase.
 *
 * @design Adding a new entity type
 * 1. Define a new `data` type (e.g. `GameResultData`)
 * 2. Create a variant type extending `FeedItemBase` with a literal `entityType`
 * 3. Add the variant to the `FeedItem` union
 * 4. Add batch-fetch logic in `queries.ts` (see existing patterns)
 * 5. Add a card component and a `case` in `FeedCard.tsx`
 * 6. INSERT into `feed_items` transactionally alongside entity creation
 *
 * @design isNewEntry (challenge_rank_update)
 * `true` when the user's first-ever score for a leaderboard key is recorded;
 * `false` when an existing best score is surpassed.
 */
import type { BlindfoldDisplaySettings } from '@blindfold-chess/features/board-display';
import type { FinalGameOutcome } from '@blindfold-chess/types';

import type { BoardAnnotations } from '@/lib/board-annotations/types';
import type { LikeMeta } from '@/lib/db/like-queries';
import type { ReplyMeta } from '@/lib/db/reply-meta-queries';
import type { PositionType } from '@/lib/positions/types';

import type { ProfilePostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/shared';

/**
 * The profile fields every feed card renders for whoever produced the entry —
 * avatar, display name, and the flag / flair chips beside it. `null` where the
 * entry has no registered author (an anonymous published game).
 */
export type FeedActor = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  country: string | null;
  flair: string | null;
};

export type PositionFeedData = {
  id: string;
  /** Used to route the card to the correct detail page. */
  type: PositionType;
  fen: string;
  createdAt: string; // ISO 8601
  author: FeedActor | null;
  likeMeta: LikeMeta;
  /**
   * Comments live in `topic_posts` keyed by `(topicType, topicKey)` where
   * `topicKey` is the position's id and `topicType` is `'position_memory'` or
   * `'position_puzzle'`.
   */
  replyMeta: ReplyMeta;
};

type FeedItemBase = {
  id: string;
  entityType: string;
  entityId: string;
  actorId: string;
  createdAt: string; // ISO 8601
};

export type TopicPostFeedItem = FeedItemBase & {
  entityType: 'topic_post';
  data: ProfilePostWithReplyMeta;
};

export type ChallengeRankUpdateData = {
  menuType: string;
  leaderboardKey: string;
  score: number;
  incorrectAnswers: number;
  timeTaken: number;
  rank: number;
  /** true = first submission for this leaderboard key; false = improved existing best */
  isNewEntry: boolean;
  /** Previous rank before the improvement. Only present when isNewEntry is false. */
  previousRank?: number;
  actor: FeedActor;
};

export type ChallengeRankUpdateFeedItem = FeedItemBase & {
  entityType: 'challenge_rank_update';
  data: ChallengeRankUpdateData;
};

export type PositionFeedItem = FeedItemBase & {
  entityType: 'position';
  data: PositionFeedData;
};

/**
 * A chunk surfaces in the feed twice during its lifecycle: once when first
 * created (typically as a draft soliciting edit requests) and once when
 * promoted to published. `kind` distinguishes the two events so the card can
 * render the right action message; the chunk itself is the same row in
 * `chunks`. Comments live in `topic_posts` keyed by
 * `(topicType='chunk', topicKey=chunk.slug)` — same pattern as positions.
 */
export type ChunkFeedData = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  representativeFen: string;
  /**
   * Display-only arrows + circles overlaid on the thumbnail board, so the
   * feed shows the same annotated position as the detail page. Always
   * present (the DB column is non-null, defaulting to the empty shape).
   */
  annotations: BoardAnnotations;
  /** Snapshot of the lifecycle event that produced this feed item. */
  kind: 'created' | 'published';
  createdAt: string; // ISO 8601
  author: FeedActor | null;
  likeMeta: LikeMeta;
  replyMeta: ReplyMeta;
};

export type ChunkFeedItem = FeedItemBase & {
  entityType: 'chunk';
  data: ChunkFeedData;
};

/**
 * A published blindfold game shared to the public catalog. Emitted only for
 * registered authors (the feed is actor-keyed); account-less games still list
 * under `/games/shared` but never surface a feed item. The board thumbnail is
 * the game's opening position (`startingFen`, or the standard start), matching
 * both the gallery card and the detail page's opening-board landing. Comments
 * live in `game_comments` keyed by `game_id` (see `getGameCommentMetaMap`).
 */
export type GameFeedData = {
  id: string;
  title: string;
  fen: string;
  /**
   * Blindfold "as played" treatment for the thumbnail, folded from the game's
   * start-of-game play-settings snapshot; null for legacy / fully-sighted games
   * (plain thumbnail). See {@link playSettingsToThumbnailDisplay}.
   */
  thumbnailDisplay: BlindfoldDisplaySettings | null;
  result: FinalGameOutcome;
  createdAt: string; // ISO 8601
  author: FeedActor | null;
  likeMeta: LikeMeta;
  replyMeta: ReplyMeta;
};

export type GameFeedItem = FeedItemBase & {
  entityType: 'game';
  data: GameFeedData;
};

// Discriminated union — extend with new entity types here
export type FeedItem =
  TopicPostFeedItem | ChallengeRankUpdateFeedItem | PositionFeedItem | ChunkFeedItem | GameFeedItem;

export type FeedResponse = {
  items: FeedItem[];
  nextCursor: string | null;
};

/**
 * A single entry in the interleaved feed + ad display list. Ad entries carry
 * an `adIndex` (0-based ordinal among ad slots) so the client can rotate
 * through the available native-ad creatives (`creatives[adIndex % n]`).
 */
export type DisplayItem = { type: 'feed'; item: FeedItem } | { type: 'ad'; adIndex: number };
