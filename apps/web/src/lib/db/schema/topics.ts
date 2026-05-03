/**
 * UGC topic post tables — topic posts, likes, ratings, follows/blocks,
 * and the per-kind attachment family (PGN, embed, image).
 */
export {
  topicPosts,
  likes,
  topicPostRatings,
  userFollows,
  userBlocks,
  postImageAttachments,
} from './tables';

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
  PostImageAttachment,
  NewPostImageAttachment,
} from './tables';
