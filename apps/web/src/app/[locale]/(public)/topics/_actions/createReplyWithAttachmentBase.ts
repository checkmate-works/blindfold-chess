'use server';

import { authenticateAndCheckBan } from '@/lib/auth';
import { postGamePgnAttachments } from '@/lib/db';
import type { DbTx } from '@/lib/db/types';
import {
  buildPgnAttachmentValues,
  pgnAttachmentErrorKey,
} from '@/lib/games/build-pgn-attachment-values';
import { RATE_LIMITS, checkRateLimit } from '@/lib/security/rate-limit';

import type { TopicType } from '@/app/[locale]/(public)/topics/_lib/constants';

import type { CreateReplyState } from './createReply';
import { createReplyBase } from './createReply';

/**
 * @design Shared attachment-aware reply Server Action body (#84 phase D)
 *
 * Mirrors `createPostWithAttachmentBase` for the reply (comment) surface.
 * `post_game_pgn_attachments` is keyed on `postId` and the schema does
 * not distinguish top-level posts from replies, so the attachment row
 * for a reply lands in the same table — only the `parent_id` /
 * `root_post_id` columns on `topic_posts` distinguish the two. The PGN
 * parsing / Lichess auto-fetch / chess-core validation logic is shared
 * with the post surface via `buildPgnAttachmentValues`, so the per-topic
 * reply wrappers only describe topic spec + optional redirect / revalidate
 * overrides.
 */

type ExtraAfterInsert = (tx: DbTx, replyId: string) => Promise<void>;

export async function createReplyWithAttachmentBase(args: {
  locale: string;
  topicIdentifier: string;
  postId: string;
  topicType: TopicType;
  topicKey: string;
  urlSegment: string;
  validateTopic: (identifier: string) => boolean | Promise<boolean>;
  redirectPath?: (postId: string, replyId: string) => string;
  revalidate?: (postId: string) => string;
  isSpoiler?: boolean;
  /** Topic-specific extra rows to insert inside the same transaction
   *  as the reply + PGN attachment. */
  extraAfterInsert?: ExtraAfterInsert;
  formData: FormData;
}): Promise<CreateReplyState> {
  const { formData, extraAfterInsert, ...replySpec } = args;

  const rawAttachment = formData.get('attachment');
  const attachmentRaw =
    typeof rawAttachment === 'string' && rawAttachment.trim().length > 0 ? rawAttachment : null;

  const anonymize = formData.get('attachmentAnonymize') === 'on';

  // Fast-path: no attachment → plain createReplyBase, no per-
  // attachment rate-limit consumption.
  if (attachmentRaw === null) {
    return createReplyBase({
      ...replySpec,
      afterInsert: extraAfterInsert,
      formData,
    });
  }

  // Authenticate first so the per-attachment rate limit is charged
  // against the actual user.
  const guardResult = await authenticateAndCheckBan();
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }

  const attachmentRateLimit = await checkRateLimit(
    guardResult.user.id,
    RATE_LIMITS.createPostWithAttachment
  );
  if ('error' in attachmentRateLimit) {
    return { error: 'attachment.error.rateLimitedPostWithAttachment' };
  }

  const built = await buildPgnAttachmentValues(attachmentRaw, { anonymize });
  if (!built.ok) {
    return { error: pgnAttachmentErrorKey(built.error) };
  }

  return createReplyBase({
    ...replySpec,
    afterInsert: async (tx, replyId) => {
      await tx.insert(postGamePgnAttachments).values({
        postId: replyId,
        ...built.values,
      });
      if (extraAfterInsert) {
        await extraAfterInsert(tx, replyId);
      }
    },
    formData,
  });
}
