'use server';

import { validateFenSemantic } from '@blindfold-chess/features/chess-core';

import { getChunkBySlug } from '@/lib/chunks/queries';
import { postFenAttachments } from '@/lib/db';
import { extractPgErrorCode } from '@/lib/db/extract-pg-error-code';
import { FEN_MAX_LENGTH } from '@/lib/post-fens/constants';
import { sanitizeFenCaption } from '@/lib/post-fens/sanitize-fen-caption';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateContent } from '@/lib/validations/content';

import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostBase } from '@/app/[locale]/(public)/topics/_actions/createPost';

/**
 * Maximum length of a stored caption. Aligned with
 * `post_fen_attachments.caption` column width and `sanitizeFenCaption`'s cap.
 * Pre-sanitize gate so we surface a structured error instead of silently
 * truncating.
 */
const CAPTION_MAX_LENGTH = 200;

/**
 * Server Action: create a chunk-topic post with an attached FEN position
 * in a single transaction.
 *
 * @description
 * Pairs `createChunkPostWithEmbedAttachment` for the FEN kind. Validation
 * order mirrors `attachPostFen.ts` so the two entry points stay
 * interchangeable from a contract perspective:
 *   1. trim FEN once at the top (Lessons §10 — single canonical value
 *      shared by the validator, the length pre-check, and the INSERT)
 *   2. structural + semantic FEN validation via `validateFenSemantic`
 *   3. caption length pre-check + sanitization
 *   4. atomic INSERT inside the post-creation transaction
 *
 * @design Trim canonicalization (Lessons §10)
 *
 * `validateFenSemantic` calls `.trim()` internally, but the DB CHECK
 * regex is anchored (`^...$`) and does NOT trim — so passing the
 * untrimmed value would let whitespace-padded FENs pass validation and
 * then trip the CHECK constraint, leaking a confusing 23514 error. The
 * single trim at the top of the action keeps validator contract and DB
 * contract in lock-step.
 *
 * @design SQLSTATE mapping (Lessons §11 + §16)
 *
 * Catches Drizzle-wrapped insert failures via the canonical
 * `extractPgErrorCode` helper from `@/lib/db/extract-pg-error-code`
 * (walks `err.cause` per Lessons §16). Three branches:
 *   - `23505` (unique_violation) → `alreadyAttached`
 *   - `23514` (check_violation) → `invalidFenStructure` (defense-in-depth)
 *   - `22001` (string_data_right_truncation) → `fenTooLong` (defense-in-depth)
 *
 * The 23514 / 22001 branches are practically unreachable from the action
 * layer because the upstream regex / length pre-check fires first; they
 * exist as the failsafe if the DB CHECK ever drifts ahead of the app
 * regex (mirrors the posture in `attachPostVideo.ts`).
 *
 * @design Why a separate integrated action (vs. `attachPostFen` after `createChunkPost`)
 *
 * Calling `attachPostFen` post-create would (a) split atomicity across
 * two transactions, (b) double-charge the rate-limit (createPost +
 * attachPostFen), and (c) leak a "post created but FEN missing" state
 * to the user on any DB error in the second call. Pulling the INSERT
 * inside `createPostBase`'s `afterInsert` hook keeps the row pair atomic
 * and matches the embed-attachment template.
 */
export async function createChunkPostWithFenAttachment(
  locale: string,
  slug: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  const rawFenInput = formData.get('attachmentFen');
  const rawCaptionInput = formData.get('attachmentFenCaption');

  // Single canonical trim (Lessons §10).
  const fen = typeof rawFenInput === 'string' ? rawFenInput.trim() : '';

  if (fen.length === 0) {
    return { error: 'postFenAttachment.error.fenRequired' };
  }
  if (fen.length > FEN_MAX_LENGTH) {
    return { error: 'postFenAttachment.error.fenTooLong' };
  }

  const fenResult = validateFenSemantic(fen);
  if (!fenResult.ok) {
    switch (fenResult.reason) {
      case 'structure':
        return { error: 'postFenAttachment.error.invalidFenStructure' };
      case 'kings':
      case 'pawn_placement':
      case 'piece_count':
      case 'castling_rights':
      case 'en_passant':
      case 'illegal_position':
        return { error: 'postFenAttachment.error.invalidFenSemantic' };
      default: {
        // Compile-time exhaustiveness guard. Adding a FenSemanticReason
        // variant without a matching case above will fail this assignment.
        const _exhaustive: never = fenResult.reason;
        void _exhaustive;
        return { error: 'postFenAttachment.error.invalidFenSemantic' };
      }
    }
  }

  const rawCaption = typeof rawCaptionInput === 'string' ? rawCaptionInput : null;
  if (typeof rawCaption === 'string' && rawCaption.length > CAPTION_MAX_LENGTH) {
    return { error: 'postFenAttachment.error.captionTooLong' };
  }
  const caption = sanitizeFenCaption(rawCaption);

  try {
    return await createPostBase({
      locale,
      topicIdentifier: slug,
      topicType: 'chunk',
      topicKey: slug,
      urlSegment: 'chunks',
      validateTopic: async (s) => (await getChunkBySlug(s)) !== null,
      invalidTopicError: 'Invalid chunk',
      rateLimit: RATE_LIMITS.createPost,
      validateContent,
      emitFeedItem: false,
      redirectPath: (postId, { toast }) =>
        `/${locale}/chunks/${slug}${toast ? '?toast=post_created' : ''}#post-${postId}`,
      afterInsert: async (tx, postId) => {
        await tx.insert(postFenAttachments).values({
          postId,
          fen,
          caption,
        });
      },
      formData,
    });
  } catch (err) {
    const code = extractPgErrorCode(err);
    if (code === '23505') {
      return { error: 'postFenAttachment.error.alreadyAttached' };
    }
    if (code === '23514') {
      // Defense-in-depth: structural regex + semantic validator above
      // already cover every condition the DB CHECK could fail on. Triage
      // points if this ever fires:
      //   - structural FEN regex (JS pin):
      //       apps/web/src/lib/post-fens/fen-check-regex.test.ts
      //   - DB CHECK source (constraint
      //       `post_fen_attachments_chk_fen_format`):
      //       apps/web/drizzle/20260504070000_create_post_fen_attachments.sql
      //       apps/web/src/lib/db/schema/tables.ts (postFenAttachments)
      //   - semantic validator:
      //       packages/features/src/chess-core/validate-fen-semantic.ts
      return { error: 'postFenAttachment.error.invalidFenStructure' };
    }
    if (code === '22001') {
      // Defense-in-depth: app-layer length pre-check on `fen` already
      // guards against this. Caption truncation is suppressed by the
      // sanitizer's slice, so this branch only fires on a column-width
      // shrink without a matching pre-check tightening.
      return { error: 'postFenAttachment.error.fenTooLong' };
    }
    throw err;
  }
}
