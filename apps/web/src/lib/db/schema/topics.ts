/**
 * UGC topic post tables — topic posts, likes, ratings, follows/blocks.
 */
export { topicPosts, likes, topicPostRatings, userFollows, userBlocks } from './tables';

export type {
  TopicPost,
  NewTopicPost,
  Like,
  NewLike,
  TopicPostRating,
  NewTopicPostRating,
  UserFollow,
  NewUserFollow,
  UserBlock,
  NewUserBlock,
} from './tables';
