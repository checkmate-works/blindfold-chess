'use server';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { db, postFenAttachments } from '@/lib/db';
import {
  buildFenAttachmentValues,
  fenAttachmentErrorKey,
  fenAttachmentPgErrorKind,
} from '@/lib/post-fens/build-fen-attachment-values';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { loadAuthoredPost } from '@/lib/topic-posts';

/**
 * Edit-flow adapter: same auth + validation pipeline as `attachPostFen`,
 * but called with the `(postId, locale, formData)` shape the client-side
 * `EditableAttachments` builds when the user submits the AttachmentModal.
 * Reads `attachmentFen` + `attachmentFenCaption` off the FormData (the
 * field names the create flow already emits) and forwards to the typed
 * action. Pulling the inputs off FormData lives here rather than in the
 * client component so the dotted-error-key contract stays a property of
 * the action, not the caller.
 */
export async function attachPostFenFromForm(
  postId: string,
  // Positional slot kept for the shared `AttachAction` signature; the action
  // itself has no locale-dependent behaviour any more.
  _locale: string,
  formData: FormData
): Promise<
  ActionResult<{
    attachment: { id: string; fen: string; caption: string | null; createdAt: Date };
  }>
> {
  const rawFen = formData.get('attachmentFen');
  const fen = typeof rawFen === 'string' ? rawFen : '';
  const rawCaption = formData.get('attachmentFenCaption');
  const caption = typeof rawCaption === 'string' ? rawCaption : null;
  return attachPostFen({ postId, fen, caption });
}

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

  // Trim + structural + semantic FEN validation and caption sanitization in
  // one shared call (identical to the create-flow bases). Runs before auth so
  // obviously-bad input is rejected without a DB round-trip; `buildFenAttachmentValues`
  // is pure and synchronous, so this ordering has no rate-limit / DoS impact.
  const built = buildFenAttachmentValues(rawFenInput, rawCaption);
  if (!built.ok) {
    return { error: fenAttachmentErrorKey(built.error) };
  }
  const { fen, caption } = built.values;

  const guardResult = await authenticateAndGuard(RATE_LIMITS.attachPostFen);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  // Parent-post existence + ownership + not soft-deleted. Mirrors the
  // posture in /api/posts/[id]/images. A soft-deleted post is reported as
  // postNotFound — the FEN flow does not distinguish a tombstone.
  const lookup = await loadAuthoredPost(postId, user.id);
  if ('error' in lookup) {
    return {
      error:
        lookup.error === 'unauthorized'
          ? 'postFenAttachment.error.notOwner'
          : 'postFenAttachment.error.postNotFound',
    };
  }
  const { post } = lookup;

  // INSERT. The 1:0..1 invariant is enforced by UNIQUE(post_id); a
  // duplicate insert surfaces as a Postgres unique-violation that is mapped
  // to the dedicated error key.
  try {
    const [row] = await db
      .insert(postFenAttachments)
      .values({
        postId: post.id,
        fen,
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
    // Shared INSERT-time SQLSTATE mapping (23505 → alreadyAttached, and the
    // defense-in-depth 23514 / 22001 branches, all practically unreachable
    // because `buildFenAttachmentValues` above catches every condition the DB
    // CHECK / varchar width could fail on). If a defensive branch ever fires,
    // triage by comparing the upstream guards against the DB CHECK constraint
    // `post_fen_attachments_chk_fen_format`:
    //   - structural FEN regex (JS pin): apps/web/src/lib/post-fens/fen-check-regex.test.ts
    //   - DB CHECK source: apps/web/drizzle/20260504070000_create_post_fen_attachments.sql
    //     + apps/web/src/lib/db/schema/tables.ts (postFenAttachments)
    //   - semantic validator: packages/features/src/chess-core/validate-fen-semantic.ts
    const kind = fenAttachmentPgErrorKind(err);
    if (kind) {
      return { error: fenAttachmentErrorKey(kind) };
    }
    throw err;
  }
}
