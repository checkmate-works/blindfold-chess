/**
 * Shared-game comments (per-move advice, Reddit-style threads).
 *
 * Ply-anchored comments on a published game: `ply = N` targets a move, `ply =
 * NULL` is a whole-game comment. Replies self-reference via `parent_id` and
 * inherit their parent's `ply`, so one move's thread shares a `ply` and the
 * tree is built per-ply on the client. Likes reuse the generic polymorphic
 * `likes` table under `target_type = 'game_comment'`. Members-only writes
 * (enforced in the action); reads expose the author's public profile.
 */
import { asc, eq } from 'drizzle-orm';
import 'server-only';

import { db } from './index';
import { getLikeMetaMap } from './like-queries';
import { AUTHOR_PROFILE_COLUMNS, liveProfileJoinOn } from './profile-select';
import { gameComments, profiles } from './schema';

export const GAME_COMMENT_LIKE_TARGET = 'game_comment';

export type GameCommentItem = {
  id: string;
  ply: number | null;
  parentId: string | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  authorId: string | null;
  author: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  likeCount: number;
  likedByMe: boolean;
};

/**
 * Every comment for a game (including soft-deleted rows, so the client can
 * render tombstones that still anchor live replies), oldest first — the
 * UUIDv7 id is time-ordered, keeping sibling replies chronological for the
 * tree builder. Deleted rows are stripped of their body + author before they
 * leave the server so retracted content / identity is never shipped. Each
 * live comment carries its like meta (count + liked-by-me) for `currentUserId`.
 */
export async function listGameComments(
  gameId: string,
  currentUserId?: string
): Promise<GameCommentItem[]> {
  const rows = await db
    .select({
      id: gameComments.id,
      ply: gameComments.ply,
      parentId: gameComments.parentId,
      body: gameComments.body,
      createdAt: gameComments.createdAt,
      updatedAt: gameComments.updatedAt,
      deletedAt: gameComments.deletedAt,
      authorId: gameComments.authorId,
      authorUsername: profiles.username,
      authorDisplayName: profiles.displayName,
      authorAvatarUrl: profiles.avatarUrl,
    })
    .from(gameComments)
    .leftJoin(profiles, liveProfileJoinOn(gameComments.authorId))
    .where(eq(gameComments.gameId, gameId))
    .orderBy(asc(gameComments.id));

  const likeMeta = await getLikeMetaMap(
    GAME_COMMENT_LIKE_TARGET,
    rows.filter((r) => r.deletedAt === null).map((r) => r.id),
    currentUserId
  );

  return rows.map((r) => {
    const isDeleted = r.deletedAt !== null;
    const meta = likeMeta.get(r.id);
    return {
      id: r.id,
      ply: r.ply,
      parentId: r.parentId,
      body: isDeleted ? '' : r.body,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      deletedAt: r.deletedAt,
      authorId: r.authorId,
      author:
        isDeleted || !r.authorUsername
          ? null
          : {
              username: r.authorUsername,
              displayName: r.authorDisplayName,
              avatarUrl: r.authorAvatarUrl,
            },
      likeCount: meta?.likeCount ?? 0,
      likedByMe: meta?.likedByMe ?? false,
    };
  });
}

/**
 * The viewer's public profile fields needed to enable + optimistically render
 * their own comment (avatar, name, profile link). Null if the user has no
 * profile row yet.
 */
export async function getCommentUserProfile(userId: string): Promise<{
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
} | null> {
  const [row] = await db
    .select(AUTHOR_PROFILE_COLUMNS)
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return row ? { id: userId, ...row } : null;
}

/**
 * A live parent comment's `ply` + `gameId` + `authorId`, used to (a) inherit
 * the ply onto a reply, (b) verify the reply targets the same game, and
 * (c) notify the parent's author of the reply. Undefined if the parent is
 * missing or already deleted.
 */
export async function getGameCommentParent(
  parentId: string
): Promise<{ ply: number | null; gameId: string; authorId: string | null } | undefined> {
  const [row] = await db
    .select({
      ply: gameComments.ply,
      gameId: gameComments.gameId,
      authorId: gameComments.authorId,
      deletedAt: gameComments.deletedAt,
    })
    .from(gameComments)
    .where(eq(gameComments.id, parentId))
    .limit(1);
  if (!row || row.deletedAt !== null) return undefined;
  return { ply: row.ply, gameId: row.gameId, authorId: row.authorId };
}

/** Insert a comment (or reply), returning the row needed to render it. */
export async function insertGameComment(params: {
  gameId: string;
  ply: number | null;
  parentId: string | null;
  authorId: string;
  body: string;
}): Promise<{ id: string; createdAt: Date; updatedAt: Date }> {
  const [row] = await db
    .insert(gameComments)
    .values({
      gameId: params.gameId,
      ply: params.ply,
      parentId: params.parentId,
      authorId: params.authorId,
      body: params.body,
    })
    .returning({
      id: gameComments.id,
      createdAt: gameComments.createdAt,
      updatedAt: gameComments.updatedAt,
    });
  return row;
}

/** Owner + game of a live comment, for the like notification / revalidation. */
export async function getGameCommentTarget(
  commentId: string
): Promise<{ authorId: string | null; gameId: string } | null> {
  const [row] = await db
    .select({
      authorId: gameComments.authorId,
      gameId: gameComments.gameId,
      deletedAt: gameComments.deletedAt,
    })
    .from(gameComments)
    .where(eq(gameComments.id, commentId))
    .limit(1);
  if (!row || row.deletedAt !== null) return null;
  return { authorId: row.authorId, gameId: row.gameId };
}

/** Author id of a live comment (for edit / delete authorization), or null if missing. */
export async function getGameCommentAuthorId(
  commentId: string
): Promise<string | null | undefined> {
  const [row] = await db
    .select({ authorId: gameComments.authorId, deletedAt: gameComments.deletedAt })
    .from(gameComments)
    .where(eq(gameComments.id, commentId))
    .limit(1);
  if (!row || row.deletedAt !== null) return undefined;
  return row.authorId;
}

/** Edit a comment's body in place, bumping `updated_at`. Returns the new timestamp. */
export async function editGameComment(
  commentId: string,
  body: string
): Promise<{ updatedAt: Date } | undefined> {
  const [row] = await db
    .update(gameComments)
    .set({ body, updatedAt: new Date() })
    .where(eq(gameComments.id, commentId))
    .returning({ updatedAt: gameComments.updatedAt });
  return row ? { updatedAt: row.updatedAt } : undefined;
}

/** Soft-delete a comment. */
export async function softDeleteGameComment(commentId: string): Promise<void> {
  await db
    .update(gameComments)
    .set({ deletedAt: new Date() })
    .where(eq(gameComments.id, commentId));
}
