import { getLikeMetaForPost } from '@/app/[locale]/(public)/topics/_lib/like-queries';
import { attachPostMeta } from '@/app/[locale]/(public)/topics/_lib/post-meta';
import {
  getPostByIdAndTopicKey,
  getPostCountByTopicKey,
  getPostCountByTopicType,
  getPostsByTopicTypePaginated,
  getPostsWithReplyMetaByTopicKey,
  getPostsWithReplyMetaPaginatedByTopicKey,
  getRecentPostsByTopicType,
  getRepliesByPostId,
  getTopLevelPostsByTopicKey,
} from '@/app/[locale]/(public)/topics/_lib/queries';
import type {
  LikeMeta,
  PostWithReplyMeta,
  ProfilePostWithReplyMeta,
  Replier,
  ReplyMeta,
  SortMode,
  TopicPostWithAuthor,
} from '@/app/[locale]/(public)/topics/_lib/shared';
import { getPostsByUserId } from '@/app/[locale]/(public)/topics/_lib/user-post-queries';

export { attachPostMeta, getPostsByUserId, getLikeMetaForPost, getRepliesByPostId };
export type {
  LikeMeta,
  PostWithReplyMeta,
  ProfilePostWithReplyMeta,
  Replier,
  ReplyMeta,
  SortMode,
  TopicPostWithAuthor,
};

/**
 * Get top-level posts for a specific square
 */
export const getPostsForSquare = (square: string): Promise<TopicPostWithAuthor[]> =>
  getTopLevelPostsByTopicKey('square', square);

/**
 * Get a single post by ID, verifying it belongs to the given square
 */
export const getPostById = (postId: string, square: string): Promise<TopicPostWithAuthor | null> =>
  getPostByIdAndTopicKey(postId, 'square', square);

/**
 * Get top-level posts for a square with reply metadata, sorted by the given mode.
 */
export const getPostsWithReplyMeta = (
  square: string,
  currentUserId?: string,
  sortBy: SortMode = 'new'
): Promise<PostWithReplyMeta[]> =>
  getPostsWithReplyMetaByTopicKey('square', square, currentUserId, sortBy);

/**
 * Get the count of top-level posts for a specific square.
 */
export const getPostCountForSquare = (square: string): Promise<number> =>
  getPostCountByTopicKey('square', square);

/**
 * Get paginated top-level posts for a square with reply metadata, sorted.
 * Uses SQL-level LIMIT/OFFSET when possible (for 'new' sort).
 */
export const getPostsWithReplyMetaPaginated = (
  square: string,
  limit: number,
  offset: number,
  currentUserId?: string,
  sortBy: SortMode = 'new'
): Promise<PostWithReplyMeta[]> =>
  getPostsWithReplyMetaPaginatedByTopicKey('square', square, limit, offset, currentUserId, sortBy);

/**
 * Get the most recent top-level posts across all squares with reply metadata.
 */
export const getRecentPostsAcrossSquares = (
  limit = 5,
  currentUserId?: string
): Promise<PostWithReplyMeta[]> => getRecentPostsByTopicType('square', limit, currentUserId);

/**
 * Get the count of top-level posts across all squares.
 */
export const getPostCountAcrossSquares = (): Promise<number> => getPostCountByTopicType('square');

/**
 * Get top-level posts across all squares with reply metadata, paginated.
 */
export const getPostsAcrossSquaresPaginated = (
  limit: number,
  offset: number,
  currentUserId?: string
): Promise<PostWithReplyMeta[]> =>
  getPostsByTopicTypePaginated('square', limit, offset, currentUserId);
