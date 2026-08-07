import type { ReactNode } from 'react';

import type { ChunkOption } from '@/lib/chunks/types';
import type { GameChunkItem } from '@/lib/db/game-chunks';
import type { GameCommentItem } from '@/lib/db/game-comments';

import type { CommentUser } from '../_components/GameCommentContext';

/**
 * The social layer of the review, injected as a discriminated union so the same
 * component serves a published game (`live` — real comments/chunks/likes wired
 * to server actions) and a not-yet-shared local game on the result screen
 * (`local` — no social data; a share CTA sits where the discussion would be).
 */
export type ReplaySocial =
  | {
      mode: 'live';
      /**
       * Whether the viewer is signed in — drives the members-only stats gate.
       * Kept distinct from {@link currentUser}: a signed-in viewer without a
       * comment profile (e.g. one not yet provisioned) is still a member and
       * must not be shown the sign-up gate.
       */
      isAuthenticated: boolean;
      /** Published game id, used to anchor the per-move comment threads. */
      gameId: string;
      /** Advice comments on this game, anchored per move (ply). */
      comments: GameCommentItem[];
      /** Community chunk links on this game, anchored per move (ply). */
      gameChunks: GameChunkItem[];
      /** Published chunks selectable in the per-move chunk picker. */
      availableChunks: ChunkOption[];
      /** The viewer, if signed in — enables posting and delete-own. */
      currentUser: CommentUser | null;
      /** Whether the viewer is the game's registered owner (may remove any chunk link). */
      isGameOwner: boolean;
      /** When set (from a like notification), open at this comment's move and scroll to it. */
      highlightCommentId?: string;
    }
  | {
      mode: 'local';
      /** Whether the local viewer is signed in — drives the stats auth-gate. */
      isAuthenticated: boolean;
      /**
       * Body of the Discussion tab for a not-yet-shared game — the compose CTAs
       * that route to a sign-in / share prompt (see `LocalDiscussionPanel`). A
       * render prop because the caller can't know the board position: on the
       * opening board the published game offers no chunk suggestions (chunks
       * are per-move), so the local CTA set mirrors that per position.
       */
      discussionContent: ((ctx: { isInitialPosition: boolean }) => ReactNode) | null;
    };

/**
 * Stable empty collections for `local` mode, so hook deps never churn.
 * Frozen (same idiom as EMPTY_BOARD_ANNOTATIONS): these are shared across
 * every consumer, so an accidental push would corrupt all of them at once.
 */
const NO_COMMENTS = Object.freeze([] as GameCommentItem[]) as unknown as GameCommentItem[];
const NO_CHUNKS = Object.freeze([] as GameChunkItem[]) as unknown as GameChunkItem[];
const NO_AVAILABLE_CHUNKS = Object.freeze([] as ChunkOption[]) as unknown as ChunkOption[];

export type NormalizedReplaySocial = {
  isLive: boolean;
  gameId: string;
  comments: GameCommentItem[];
  gameChunks: GameChunkItem[];
  availableChunks: ChunkOption[];
  currentUser: CommentUser | null;
  isGameOwner: boolean;
  highlightCommentId: string | undefined;
  /**
   * Auth drives the members-only stats gate; both modes carry it explicitly,
   * so a signed-in viewer without a comment profile still sees the stats (not
   * the sign-up gate).
   */
  viewerIsAuthenticated: boolean;
};

/**
 * Flatten the {@link ReplaySocial} union into the fields the review body
 * reads. `local` mode yields the stable empty collections so the existing
 * body — the discussion rollup, deep-link, per-move contributions —
 * naturally collapses to nothing (a `local` game has no server-anchored
 * comments/chunks) without churning hook deps.
 */
export function normalizeReplaySocial(social: ReplaySocial): NormalizedReplaySocial {
  const isLive = social.mode === 'live';
  return {
    isLive,
    gameId: isLive ? social.gameId : '',
    comments: isLive ? social.comments : NO_COMMENTS,
    gameChunks: isLive ? social.gameChunks : NO_CHUNKS,
    availableChunks: isLive ? social.availableChunks : NO_AVAILABLE_CHUNKS,
    currentUser: isLive ? social.currentUser : null,
    isGameOwner: isLive ? social.isGameOwner : false,
    highlightCommentId: isLive ? social.highlightCommentId : undefined,
    viewerIsAuthenticated: social.isAuthenticated,
  };
}
