'use server';

import { parseMoveTopicKey } from '@/lib/repertoires/move-topic-key';
import { getRepertoireById } from '@/lib/repertoires/queries';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { readSpoilerFlag } from '@/lib/spoiler-flag';
import { validateContent } from '@/lib/validations/content';

import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostWithAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createPostWithAttachmentBase';

/**
 * Top-level comment on a move (topicType 'repertoire_move'), PGN attachment.
 * The thread key is position-based; `lineNo`/`ply` are bound by the compose
 * form (the page knows where the user is) only to land the redirect back on the
 * same move.
 */
export async function createMovePostWithAttachment(
  locale: string,
  topicKey: string,
  lineNo: number,
  ply: number,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  const parsed = parseMoveTopicKey(topicKey);
  if (!parsed) return { error: 'Invalid move' };
  const { repertoireId } = parsed;
  const isSpoiler = readSpoilerFlag(formData);
  const repertoire = await getRepertoireById(repertoireId);

  return createPostWithAttachmentBase({
    locale,
    topicIdentifier: topicKey,
    topicType: 'repertoire_move',
    topicKey,
    urlSegment: 'repertoires',
    validateTopic: () => repertoire !== null,
    invalidTopicError: 'Invalid repertoire',
    rateLimit: RATE_LIMITS.createPost,
    validateContent,
    emitFeedItem: false,
    isSpoiler,
    topicAuthorId: repertoire?.userId ?? undefined,
    redirectPath: (postId, { toast }) =>
      `/${locale}/repertoires/${repertoireId}/lines/${lineNo}?move=${ply}${
        toast ? '&toast=post_created' : ''
      }#post-${postId}`,
    formData,
  });
}
