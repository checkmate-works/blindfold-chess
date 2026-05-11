'use server';

import { validateAttachedPgn } from '@blindfold-chess/features/chess-core';

import { authenticateAndCheckBan } from '@/lib/auth';
import { postGamePgnAttachments } from '@/lib/db';
import type { DbTx } from '@/lib/db/types';
import { resolveLichessAttachmentPgn } from '@/lib/games/resolve-lichess-attachment';
import { sanitizePgnHeader } from '@/lib/games/sanitize-pgn-header';
import { detectAttachmentInput } from '@/lib/games/validation';
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
 * parsing / Lichess auto-fetch / chess-core validation logic is byte-
 * for-byte identical, so the per-topic reply wrappers only describe
 * topic spec + optional redirect / revalidate overrides.
 */

function attachmentErrorKey(
  err:
    | 'empty'
    | 'too_large'
    | 'invalid_pgn'
    | 'no_moves'
    | 'invalid_id'
    | 'not_found'
    | 'rate_limited'
    | 'fetch_failed'
    | 'lichess_unsupported'
    | 'chesscom_invalid_url'
    | 'chesscom_invalid_pgn'
    | 'chesscom_pgn_required'
    | 'unknown'
): string {
  switch (err) {
    case 'empty':
      return 'attachment.error.empty';
    case 'too_large':
      return 'attachment.error.tooLarge';
    case 'invalid_pgn':
      return 'attachment.error.invalidPgn';
    case 'no_moves':
      return 'attachment.error.noMoves';
    case 'invalid_id':
    case 'not_found':
      return 'attachment.error.lichessNotFound';
    case 'rate_limited':
      return 'attachment.error.lichessRateLimited';
    case 'fetch_failed':
      return 'attachment.error.lichessFetchFailed';
    case 'lichess_unsupported':
      return 'attachment.error.lichessStudyUnsupported';
    case 'chesscom_invalid_url':
      return 'attachment.error.chesscomInvalidUrl';
    case 'chesscom_invalid_pgn':
      return 'attachment.error.chesscomInvalidPgn';
    case 'chesscom_pgn_required':
      return 'attachment.error.chesscomPgnRequired';
    case 'unknown':
    default:
      return 'attachment.error.invalidPgn';
  }
}

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

  const detected = detectAttachmentInput(attachmentRaw);

  let pgnText: string;
  let sourceKind: 'pgn' | 'lichess';
  let canonicalUrl: string | null = null;
  let lichessGameId: string | null = null;
  let attributionPlatform: string | null = null;
  let attributionPath: string | null = null;

  switch (detected.kind) {
    case 'lichess':
    case 'lichess_embed': {
      const lichessId = detected.kind === 'lichess' ? detected.gameId : detected.embedId;
      const resolved = await resolveLichessAttachmentPgn(lichessId);
      if (!resolved.ok) {
        return { error: attachmentErrorKey(resolved.error) };
      }
      pgnText = resolved.pgn;
      sourceKind = 'lichess';
      canonicalUrl = resolved.canonicalUrl;
      lichessGameId = lichessId;
      break;
    }
    case 'pgn': {
      pgnText = detected.text;
      sourceKind = 'pgn';
      break;
    }
    case 'chesscom_attribution': {
      if (!detected.pgn) {
        return { error: attachmentErrorKey('chesscom_pgn_required') };
      }
      pgnText = detected.pgn;
      sourceKind = 'pgn';
      canonicalUrl = detected.sourceUrl;
      attributionPlatform = detected.attribution.attributionPlatform;
      attributionPath = detected.attribution.attributionPath;
      break;
    }
    case 'empty':
    case 'lichess_unsupported':
    case 'chesscom_invalid_url':
    case 'chesscom_invalid_pgn':
    case 'unknown':
      return { error: attachmentErrorKey(detected.kind) };
    case 'chesscom_embed':
    case 'chesscom_embed_invalid_url':
    case 'lichess_embed_invalid_url':
      return { error: attachmentErrorKey('unknown') };
    default: {
      const _exhaustive: never = detected;
      void _exhaustive;
      return { error: attachmentErrorKey('unknown') };
    }
  }

  const validated = validateAttachedPgn(pgnText, { anonymize });
  if (!validated.ok) {
    return { error: attachmentErrorKey(validated.error) };
  }

  return createReplyBase({
    ...replySpec,
    afterInsert: async (tx, replyId) => {
      await tx.insert(postGamePgnAttachments).values({
        postId: replyId,
        source: sourceKind,
        sourceUrl: canonicalUrl,
        sourceGameId: lichessGameId,
        pgn: validated.normalized,
        pgnByteLength: validated.byteLength,
        startingFen: validated.startingFen,
        moveCount: validated.moveCount,
        headerWhite: sanitizePgnHeader(validated.headers.white),
        headerBlack: sanitizePgnHeader(validated.headers.black),
        headerResult: sanitizePgnHeader(validated.headers.result),
        headerEvent: sanitizePgnHeader(validated.headers.event),
        headerSite: sanitizePgnHeader(validated.headers.site),
        headerDate: sanitizePgnHeader(validated.headers.date),
        anonymized: anonymize,
        attributionPlatform,
        attributionPath,
      });
      if (extraAfterInsert) {
        await extraAfterInsert(tx, replyId);
      }
    },
    formData,
  });
}
