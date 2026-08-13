import { eq } from 'drizzle-orm';

import {
  SOCIAL_AUTHOR_COLUMNS,
  chessOpenings,
  db,
  liveProfileJoinOn,
  profiles,
  topicPostRatings,
  topicPosts,
} from '@/lib/db';

import { ratingSelect } from './shared';

/**
 * Build the common base query for ProfilePostWithReplyMeta-style results.
 * Includes topicPosts + profiles + topicPostRatings + chessOpenings JOINs.
 * Returns a $dynamic() query that callers can extend with .where(), .orderBy(), .limit(), .offset().
 */
export function buildProfilePostQuery() {
  return db
    .select({
      post: topicPosts,
      author: SOCIAL_AUTHOR_COLUMNS,
      rating: ratingSelect,
      openingName: chessOpenings.name,
      openingFen: chessOpenings.fen,
    })
    .from(topicPosts)
    .leftJoin(profiles, liveProfileJoinOn(topicPosts.userId))
    .leftJoin(topicPostRatings, eq(topicPosts.id, topicPostRatings.postId))
    .leftJoin(chessOpenings, eq(topicPosts.topicKey, chessOpenings.slug))
    .$dynamic();
}
