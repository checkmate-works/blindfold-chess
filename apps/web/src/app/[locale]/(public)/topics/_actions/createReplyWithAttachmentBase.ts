'use server';

import type { DbTx } from '@/lib/db/types';
import { resolvePgnAttachment } from '@/lib/topic-posts/attachment-steps';

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
 * reply wrappers only describe topic spec + optional redirect
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
  isSpoiler?: boolean;
  /** Topic-specific extra rows to insert inside the same transaction
   *  as the reply + PGN attachment. */
  extraAfterInsert?: ExtraAfterInsert;
  formData: FormData;
}): Promise<CreateReplyState> {
  const { formData, extraAfterInsert, ...replySpec } = args;

  const attachment = await resolvePgnAttachment(formData);
  if (attachment.kind === 'error') {
    return { error: attachment.error };
  }

  return createReplyBase({
    ...replySpec,
    afterInsert:
      attachment.kind === 'none' ? extraAfterInsert : attachment.afterInsert(extraAfterInsert),
    formData,
  });
}
