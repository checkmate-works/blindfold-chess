import {
  getPostByIdAndTopicKey,
  getPostCountByTopicKey,
  getPostCountByTopicType,
  getPostsByTopicTypePaginated,
  getPostsWithReplyMetaByTopicKey,
  getPostsWithReplyMetaPaginatedByTopicKey,
  getRepliesByPostId,
} from '@/app/[locale]/(public)/topics/_lib/queries';
import type {
  PostWithReplyMeta,
  ProfilePostWithReplyMeta,
  SortMode,
  TopicPostWithAuthor,
} from '@/app/[locale]/(public)/topics/_lib/shared';
import { getPostsByUserId } from '@/app/[locale]/(public)/topics/_lib/user-post-queries';

export { getPostsByUserId, getRepliesByPostId };
export type { PostWithReplyMeta, ProfilePostWithReplyMeta, SortMode, TopicPostWithAuthor };

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
