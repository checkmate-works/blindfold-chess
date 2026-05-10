'use server';

import { validateAttachedPgn } from '@blindfold-chess/features/chess-core';

import { authenticateAndCheckBan } from '@/lib/auth';
import type { db } from '@/lib/db';
import { postGamePgnAttachments } from '@/lib/db';
import { resolveLichessAttachmentPgn } from '@/lib/games/resolve-lichess-attachment';
import { sanitizePgnHeader } from '@/lib/games/sanitize-pgn-header';
import { detectAttachmentInput } from '@/lib/games/validation';
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

type ExtraAfterInsert = (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  postId: string
) => Promise<void>;

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
      // Phase 13 (#83): /embed/{id} URLs share the auto-fetch path
      // with plain Lichess game URLs. The persisted source_url is
      // normalized to https://lichess.org/{id} regardless of which
      // form the user pasted, so the cache index hits across both.
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
      // chess.com TOS forbids us auto-fetching the PGN, so the user
      // must paste the PGN body alongside the URL. URL-only paste
      // surfaces a guidance error.
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
      // Compile-time exhaustiveness guard.
      const _exhaustive: never = detected;
      void _exhaustive;
      return { error: attachmentErrorKey('unknown') };
    }
  }

  const validated = validateAttachedPgn(pgnText, { anonymize });
  if (!validated.ok) {
    return { error: attachmentErrorKey(validated.error) };
  }

  return createPostBase({
    ...topicSpec,
    afterInsert: async (tx, postId) => {
      await tx.insert(postGamePgnAttachments).values({
        postId,
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
        await extraAfterInsert(tx, postId);
      }
    },
    formData,
  });
}
