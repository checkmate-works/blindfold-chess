import { eq } from 'drizzle-orm';

import { chessOpenings, db, profiles, topicPostRatings, topicPosts } from '@/lib/db';

import { authorSelect, ratingSelect } from './shared';

/**
 * Build the common base query for ProfilePostWithReplyMeta-style results.
 * Includes topicPosts + profiles + topicPostRatings + chessOpenings JOINs.
 * Returns a $dynamic() query that callers can extend with .where(), .orderBy(), .limit(), .offset().
 */
export function buildProfilePostQuery() {
  return db
    .select({
      post: topicPosts,
      author: authorSelect,
      rating: ratingSelect,
      openingName: chessOpenings.name,
      openingFen: chessOpenings.fen,
    })
    .from(topicPosts)
    .leftJoin(profiles, eq(topicPosts.userId, profiles.id))
    .leftJoin(topicPostRatings, eq(topicPosts.id, topicPostRatings.postId))
    .leftJoin(chessOpenings, eq(topicPosts.topicKey, chessOpenings.slug))
    .$dynamic();
}
