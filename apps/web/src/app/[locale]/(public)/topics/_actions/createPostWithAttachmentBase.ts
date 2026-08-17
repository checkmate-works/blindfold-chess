'use server';

import type { DbTx } from '@/lib/db/types';
import type { RateLimitConfig } from '@/lib/security/rate-limit';
import { resolvePgnAttachment } from '@/lib/topic-posts/attachment-steps';

import type { TopicType } from '@/app/[locale]/(public)/topics/_lib/constants';

import type { CreatePostState } from './createPost';
import { createPostBase } from './createPost';

/**
 * @design Shared attachment-aware Server Action body (#84 step 2)
 *
 * The chunks new-post form was the first place to integrate the
 * post_game_pgn_attachments INSERT into createPostBase via its
 * `afterInsert` hook. The PGN parsing / Lichess auto-fetch / chess-
 * core validation logic above the createPostBase call was identical
 * across every topicType and accounted for ~150 lines of code per
 * action wrapper. Extracting it into this base keeps that contract
 * in one place — each topicType wrapper now just describes its
 * topicSpec (topicType / topicKey / validateTopic / redirectPath /
 * etc.) and forwards the FormData. A future change to the PGN
 * pipeline (e.g. tightening the chess.js preprocessing or adding a
 * new attribution platform) lands in one file instead of five.
 */

type ExtraAfterInsert = (tx: DbTx, postId: string) => Promise<void>;

/**
 * Shared attachment-aware createPost body. Each topicType wrapper
 * forwards a topic-specific spec (validateTopic / redirectPath /
 * etc.) plus the request FormData; `resolvePgnAttachment` does
 * everything that concerns the attachment (form fields, the extra
 * rate limit, the PGN pipeline, and the `post_game_pgn_attachments`
 * INSERT that has to happen inside the post's own transaction), and
 * what is left here is the choice of `createPostBase`.
 *
 * `extraAfterInsert` lets a topicType add its own rows to that same
 * transaction — an opening rating row, say.
 *
 * If the `attachment` field is empty, the post is written with no
 * attachment row and the per-attachment rate limit is NOT consumed
 * (chunks contract).
 */
export async function createPostWithAttachmentBase(args: {
  locale: string;
  topicIdentifier: string;
  topicType: TopicType;
  topicKey: string;
  urlSegment: string;
  validateTopic: (identifier: string) => boolean | Promise<boolean>;
  invalidTopicError: string;
  rateLimit: RateLimitConfig;
  validateContent: (formData: FormData) => { error: string } | { content: string };
  redirectPath?: (postId: string, opts: { toast: boolean }) => string;
  emitFeedItem?: boolean;
  isSpoiler?: boolean;
  topicAuthorId?: string | null;
  /** Topic-specific extra rows to insert inside the same transaction
   *  as the post + PGN attachment (e.g. opening rating). */
  extraAfterInsert?: ExtraAfterInsert;
  formData: FormData;
}): Promise<CreatePostState> {
  const { formData, extraAfterInsert, ...topicSpec } = args;

  const attachment = await resolvePgnAttachment(formData);
  if (attachment.kind === 'error') {
    return { error: attachment.error };
  }

  return createPostBase({
    ...topicSpec,
    afterInsert:
      attachment.kind === 'none' ? extraAfterInsert : attachment.afterInsert(extraAfterInsert),
    formData,
  });
}
