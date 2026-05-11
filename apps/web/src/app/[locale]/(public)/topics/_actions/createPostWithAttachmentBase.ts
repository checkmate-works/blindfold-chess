'use server';

import { authenticateAndCheckBan } from '@/lib/auth';
import { postGamePgnAttachments } from '@/lib/db';
import type { DbTx } from '@/lib/db/types';
import {
  buildPgnAttachmentValues,
  pgnAttachmentErrorKey,
} from '@/lib/games/build-pgn-attachment-values';
import type { RateLimitConfig } from '@/lib/security/rate-limit';
import { RATE_LIMITS, checkRateLimit } from '@/lib/security/rate-limit';

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
 * etc.) plus the request FormData, and the base handles every step
 * common to every wrapper:
 *
 *   1. Parse `attachment` form field via `detectAttachmentInput`.
 *   2. (Lichess only) resolve canonical PGN through the DB-cached
 *      fetcher.
 *   3. (chesscom attribution) require pasted PGN body, capture the
 *      attribution path.
 *   4. Validate + normalise the PGN through chess-core, optionally
 *      anonymising player names.
 *   5. Charge `RATE_LIMITS.createPostWithAttachment` (in addition
 *      to the topic's base `rateLimit`).
 *   6. Insert the post via `createPostBase`, with the
 *      `post_game_pgn_attachments` row inserted inside the same
 *      transaction via `afterInsert` so the pair is atomic.
 *   7. (optional) chain `extraAfterInsert` for topic-specific extra
 *      writes (e.g. opening rating row).
 *
 * If the `attachment` field is empty, the base fast-paths to a
 * plain createPostBase call with no attachment row and does NOT
 * consume the per-attachment rate limit (chunks contract).
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
  topicAuthorId?: string;
  /** Topic-specific extra rows to insert inside the same transaction
   *  as the post + PGN attachment (e.g. opening rating). */
  extraAfterInsert?: ExtraAfterInsert;
  formData: FormData;
}): Promise<CreatePostState> {
  const { formData, extraAfterInsert, ...topicSpec } = args;

  const rawAttachment = formData.get('attachment');
  const attachmentRaw =
    typeof rawAttachment === 'string' && rawAttachment.trim().length > 0 ? rawAttachment : null;

  const anonymize = formData.get('attachmentAnonymize') === 'on';

  // Fast-path: no attachment → plain createPostBase, no per-
  // attachment rate-limit consumption.
  if (attachmentRaw === null) {
    return createPostBase({
      ...topicSpec,
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

  return createPostBase({
    ...topicSpec,
    afterInsert: async (tx, postId) => {
      await tx.insert(postGamePgnAttachments).values({
        postId,
        ...built.values,
      });
      if (extraAfterInsert) {
        await extraAfterInsert(tx, postId);
      }
    },
    formData,
  });
}
