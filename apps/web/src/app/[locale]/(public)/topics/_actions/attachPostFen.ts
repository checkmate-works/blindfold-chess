'use server';

import { validateFenSemantic } from '@blindfold-chess/features/chess-core';
import { eq } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { db, postFenAttachments, topicPosts } from '@/lib/db';
import { sanitizeFenCaption } from '@/lib/post-fens/sanitize-fen-caption';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/**
 * Maximum length of a stored FEN string. Mirrors the
 * `post_fen_attachments.fen` column width and the DB-level CHECK is the
 * last line of defense.
 */
const FEN_MAX_LENGTH = 100;

/**
 * Maximum length of a stored caption. Aligned with
 * `post_fen_attachments.caption` column width and `sanitizeFenCaption`'s cap.
 * The sanitizer already slices to this length; this constant is the
 * pre-sanitize gate so we surface a structured error instead of silently
 * truncating.
 */
const CAPTION_MAX_LENGTH = 200;

/**
 * Server Action: attach a FEN position to an existing topic post.
 *
 * @description
 * 1:0..1 attachment per post (`UNIQUE(post_id)` at the DB). Validation order
 * mirrors the issue spec:
 *   1. structural FEN regex (delegated to `validateFenSemantic`, which calls
 *      `validateFenStructure` first)
 *   2. chess-core semantic validation (kings, pawn placement, castling /
 *      ep consistency)
 *   3. caption length pre-check (UI guard against runaway input)
 *   4. caption sanitization (Trojan Source / zero-width / TAG strip)
 *   5. DB INSERT
 *
 * Returns explicit field shape — does NOT spread `inferSelect` to avoid
 * leaking columns that the caller did not ask for. `postId` is intentionally
 * excluded because the caller already passed it.
 *
 * @design Why a standalone action (not an `afterInsert` hook)
 *
 * The caller flow is "user attaches a FEN to an existing post" rather than
 * "user creates a post with an attached FEN". UI for this is deferred per
 * issue #74 Q2; this Server Action exists so the insert path is callable
 * and tested. When the UI lands, it can call this directly, OR a future
 * combined `createChunkPostWithFenAttachment` can mirror the PGN flow and
 * call into the same validation pipeline via a shared helper.
 */
export async function attachPostFen(input: {
  postId: string;
  fen: string;
  caption?: string | null;
}): Promise<
  ActionResult<{
    attachment: {
      id: string;
      fen: string;
      caption: string | null;
      createdAt: Date;
    };
  }>
> {
  const { postId, fen: rawFenInput, caption: rawCaption = null } = input;

  // Canonicalize FEN by trimming once at the top. `validateFenSemantic`
  // also calls `.trim()` internally, but the DB CHECK regex is anchored
  // (`^...$`) and does NOT trim — so passing the untrimmed value through
  // would let whitespace-padded FENs pass validation and then trip the
  // CHECK constraint, leaking a confusing 23514 error to the user.
  // Trimming here keeps the validator's contract honest end-to-end.
  const rawFen = typeof rawFenInput === 'string' ? rawFenInput.trim() : '';

  if (rawFen.length === 0) {
    return { error: 'postFenAttachment.error.fenRequired' };
  }
  if (rawFen.length > FEN_MAX_LENGTH) {
    return { error: 'postFenAttachment.error.fenTooLong' };
  }

  const guardResult = await authenticateAndGuard(RATE_LIMITS.attachPostFen);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  // Parent-post existence + ownership + not soft-deleted. Mirrors the
  // posture in /api/posts/[id]/images.
  const [post] = await db
    .select({
      id: topicPosts.id,
      userId: topicPosts.userId,
      deletedAt: topicPosts.deletedAt,
    })
    .from(topicPosts)
    .where(eq(topicPosts.id, postId))
    .limit(1);

  if (!post) {
    return { error: 'postFenAttachment.error.postNotFound' };
  }
  if (post.userId !== user.id) {
    return { error: 'postFenAttachment.error.notOwner' };
  }
  if (post.deletedAt !== null) {
    return { error: 'postFenAttachment.error.postNotFound' };
  }

  // 1 + 2: structural + semantic FEN validation in one call.
  const fenResult = validateFenSemantic(rawFen);
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
      default:
        return { error: 'postFenAttachment.error.invalidFenSemantic' };
    }
  }

  // 3: caption length pre-check.
  if (typeof rawCaption === 'string' && rawCaption.length > CAPTION_MAX_LENGTH) {
    return { error: 'postFenAttachment.error.captionTooLong' };
  }

  // 4: caption sanitization (returns null for empty / whitespace / all-invisible).
  const caption = sanitizeFenCaption(rawCaption ?? null);

  // 5: INSERT. The 1:0..1 invariant is enforced by UNIQUE(post_id); a
  // duplicate insert surfaces as a Postgres unique-violation that is mapped
  // to the dedicated error key.
  try {
    const [row] = await db
      .insert(postFenAttachments)
      .values({
        postId: post.id,
        fen: rawFen,
        caption,
      })
      .returning({
        id: postFenAttachments.id,
        fen: postFenAttachments.fen,
        caption: postFenAttachments.caption,
        createdAt: postFenAttachments.createdAt,
      });

    return {
      success: true,
      attachment: {
        id: row.id,
        fen: row.fen,
        caption: row.caption,
        createdAt: row.createdAt,
      },
    };
  } catch (err) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as Error & { code?: string }).code === '23505'
    ) {
      return { error: 'postFenAttachment.error.alreadyAttached' };
    }
    if (
      err instanceof Error &&
      'code' in err &&
      (err as Error & { code?: string }).code === '23514'
    ) {
      // CHECK violation — the structural regex caught something the
      // application validators missed. Surface a generic structural error.
      return { error: 'postFenAttachment.error.invalidFenStructure' };
    }
    throw err;
  }
}
