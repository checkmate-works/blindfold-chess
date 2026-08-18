'use server';

import type { DbTx } from '@/lib/db/types';
import type { RateLimitConfig } from '@/lib/security/rate-limit';
import {
  fenAttachmentInsertErrorKey,
  resolveFenAttachment,
} from '@/lib/topic-posts/attachment-steps';

import type { TopicType } from '@/app/[locale]/(public)/topics/_lib/constants';

import type { CreatePostState } from './createPost';
import { createPostBase } from './createPost';

/**
 * @design Shared FEN-attachment-aware Server Action body (#84 step 2)
 *
 * Mirrors `createPostWithAttachmentBase` for the FEN attachment kind.
 * The PGN base handles `attachment` form fields and routes through
 * `post_game_pgn_attachments`; this base handles `attachmentFen` /
 * `attachmentFenCaption` form fields and routes through
 * `post_fen_attachments`. Each topicType wrapper just describes its
 * topic spec and forwards FormData. The FEN validation pipeline and the
 * INSERT-time SQLSTATE mapping are shared with the reply base and the
 * edit-flow `attachPostFen` action via `buildFenAttachmentValues` /
 * `fenAttachmentErrorKey` / `fenAttachmentPgErrorKind`.
 */

type ExtraAfterInsert = (tx: DbTx, postId: string) => Promise<void>;

export async function createPostWithFenAttachmentBase(args: {
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
  /** Topic-specific extra rows to insert inside the same transaction. */
  extraAfterInsert?: ExtraAfterInsert;
  formData: FormData;
}): Promise<CreatePostState> {
  const { formData, extraAfterInsert, ...topicSpec } = args;

  const attachment = resolveFenAttachment(formData);
  if (attachment.kind === 'error') {
    return { error: attachment.error };
  }

  try {
    return await createPostBase({
      ...topicSpec,
      afterInsert: attachment.afterInsert(extraAfterInsert),
      formData,
    });
  } catch (err) {
    const error = fenAttachmentInsertErrorKey(err);
    if (error) {
      return { error };
    }
    throw err;
  }
}
