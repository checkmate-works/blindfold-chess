import { authenticateAndCheckBan } from '@/lib/auth';
import { postFenAttachments, postGamePgnAttachments } from '@/lib/db';
import type { DbTx } from '@/lib/db/types';
import {
  type BuildPgnAttachmentValuesResult,
  buildPgnAttachmentValues,
  pgnAttachmentErrorKey,
} from '@/lib/games/build-pgn-attachment-values';
import {
  type FenAttachmentValues,
  buildFenAttachmentValues,
  fenAttachmentErrorKey,
  fenAttachmentPgErrorKind,
} from '@/lib/post-fens/build-fen-attachment-values';
import { RATE_LIMITS, checkRateLimit } from '@/lib/security/rate-limit';

/**
 * The attachment half of the four `create{Post,Reply}With{,Fen}AttachmentBase`
 * actions.
 *
 * Those four differ in exactly one thing: whether they end in
 * `createPostBase` or `createReplyBase`. Everything either pair does with the
 * attachment itself — reading the form fields, charging the extra rate limit,
 * validating, and building the `afterInsert` callback that writes the
 * attachment row in the post's own transaction — was written out twice, down
 * to the comments. The bases keep the branching that is genuinely theirs and
 * call these.
 *
 * Not a `"use server"` module: it exports non-action values, and the four
 * bases that are actions import from it rather than re-export it.
 */

type AfterInsert = (tx: DbTx, postId: string) => Promise<void>;

/** Run `extra` after `first`, both inside the caller's transaction. */
function chain(first: AfterInsert, extra: AfterInsert | undefined): AfterInsert {
  return async (tx, postId) => {
    await first(tx, postId);
    if (extra) await extra(tx, postId);
  };
}

export type ResolvedPgnAttachment =
  /** The `attachment` field was absent or blank. */
  | { kind: 'none' }
  | { kind: 'error'; error: string }
  | { kind: 'attachment'; afterInsert: (extra?: AfterInsert) => AfterInsert };

/**
 * Read the `attachment` / `attachmentAnonymize` fields and, if a PGN is
 * present, charge the per-attachment rate limit and validate it.
 *
 * The rate limit is charged only once a PGN is actually present, and only
 * after authenticating, so it lands on the right user and a plain post never
 * consumes it — the chunks contract.
 */
export async function resolvePgnAttachment(formData: FormData): Promise<ResolvedPgnAttachment> {
  const rawAttachment = formData.get('attachment');
  const attachmentRaw =
    typeof rawAttachment === 'string' && rawAttachment.trim().length > 0 ? rawAttachment : null;
  if (attachmentRaw === null) return { kind: 'none' };

  const guardResult = await authenticateAndCheckBan();
  if ('error' in guardResult) {
    return { kind: 'error', error: guardResult.error };
  }

  const attachmentRateLimit = await checkRateLimit(
    guardResult.user.id,
    RATE_LIMITS.createPostWithAttachment
  );
  if ('error' in attachmentRateLimit) {
    return { kind: 'error', error: 'attachment.error.rateLimitedPostWithAttachment' };
  }

  const built: BuildPgnAttachmentValuesResult = await buildPgnAttachmentValues(attachmentRaw, {
    anonymize: formData.get('attachmentAnonymize') === 'on',
  });
  if (!built.ok) {
    return { kind: 'error', error: pgnAttachmentErrorKey(built.error) };
  }

  return {
    kind: 'attachment',
    afterInsert: (extra) =>
      chain(async (tx, postId) => {
        await tx.insert(postGamePgnAttachments).values({ postId, ...built.values });
      }, extra),
  };
}

export type ResolvedFenAttachment =
  | { kind: 'error'; error: string }
  | { kind: 'attachment'; afterInsert: (extra?: AfterInsert) => AfterInsert };

/**
 * Read and validate the `attachmentFen` / `attachmentFenCaption` fields.
 *
 * There is no "none" case: the FEN bases are only reached from a form that
 * carries one, and an empty value fails validation like any other bad FEN.
 */
export function resolveFenAttachment(formData: FormData): ResolvedFenAttachment {
  const built = buildFenAttachmentValues(
    formData.get('attachmentFen'),
    formData.get('attachmentFenCaption')
  );
  if (!built.ok) {
    return { kind: 'error', error: fenAttachmentErrorKey(built.error) };
  }
  const values: FenAttachmentValues = built.values;

  return {
    kind: 'attachment',
    afterInsert: (extra) =>
      chain(async (tx, postId) => {
        await tx.insert(postFenAttachments).values({ postId, ...values });
      }, extra),
  };
}

/**
 * Translate a constraint violation raised by the FEN INSERT into the error key
 * for it, or `null` if this is not one of those — in which case the caller
 * must rethrow. Some FEN rules are enforced only by the database, so they can
 * only surface once the row is being written.
 */
export function fenAttachmentInsertErrorKey(err: unknown): string | null {
  const kind = fenAttachmentPgErrorKind(err);
  return kind ? fenAttachmentErrorKey(kind) : null;
}
