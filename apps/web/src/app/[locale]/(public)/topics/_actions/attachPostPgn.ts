'use server';

import { authenticateAndGuard } from '@/lib/auth';
import { db, postGamePgnAttachments } from '@/lib/db';
import { extractPgErrorCode } from '@/lib/db/extract-pg-error-code';
import {
  buildPgnAttachmentValues,
  pgnAttachmentErrorKey,
} from '@/lib/games/build-pgn-attachment-values';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { loadAuthoredPost } from '@/lib/topic-posts';

export type AttachPostPgnResult =
  | {
      success: true;
      attachment: {
        id: string;
        createdAt: Date;
      };
    }
  | { error: string };

/**
 * Edit-flow Server Action: attach a PGN game to an existing topic_post that
 * has no attachment yet. Mirrors `attachPostFen` in shape — author-only,
 * 1:0..1 invariant enforced by `UNIQUE(post_id)` on the attachment table,
 * mapped from a Postgres `23505` unique-violation to a stable error key.
 *
 * The validation pipeline (Lichess auto-fetch / chess.com attribution /
 * chess-core normalisation / header sanitisation / anonymise) is shared
 * with `createPostWithAttachmentBase` via `buildPgnAttachmentValues`, so
 * UX copy and behaviour match the create flow.
 *
 * The action does NOT consume `RATE_LIMITS.createPostWithAttachment` —
 * that one explicitly charges against the *create-post* attachment budget
 * (Lichess fetch + post INSERT). Edit-flow attachments use the dedicated
 * `attachPostPgn` rate limit to keep the budgets independent so a stuck
 * edit loop cannot starve a user out of creating new posts.
 *
 * @design Replacement is a deliberate two-step
 *
 * The UI flow surfaces removal and attach as separate operations. If the
 * post already carries a PGN row, this action returns `alreadyAttached`
 * (FK / `23505`) and the client is responsible for first calling
 * `removePostAttachment` if the user agreed to swap. Folding the two into
 * a single transaction would force every attach call to consult the
 * attachment table even when the user is adding to a fresh post — costlier
 * than the rare swap path it would optimise.
 */
export async function attachPostPgn(
  postId: string,
  // Positional slot kept for the shared `AttachAction` signature; unused.
  _locale: string,
  formData: FormData
): Promise<AttachPostPgnResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.attachPostPgn);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  const lookup = await loadAuthoredPost(postId, user.id);
  if ('error' in lookup) {
    return { error: lookup.error };
  }
  const { post } = lookup;

  const rawAttachment = formData.get('attachment');
  const attachmentRaw =
    typeof rawAttachment === 'string' && rawAttachment.trim().length > 0 ? rawAttachment : '';
  if (attachmentRaw === '') {
    return { error: pgnAttachmentErrorKey('empty') };
  }
  const anonymize = formData.get('attachmentAnonymize') === 'on';

  const built = await buildPgnAttachmentValues(attachmentRaw, { anonymize });
  if (!built.ok) {
    return { error: pgnAttachmentErrorKey(built.error) };
  }

  try {
    const [row] = await db
      .insert(postGamePgnAttachments)
      .values({ postId: post.id, ...built.values })
      .returning({ id: postGamePgnAttachments.id, createdAt: postGamePgnAttachments.createdAt });

    return {
      success: true,
      attachment: { id: row.id, createdAt: row.createdAt },
    };
  } catch (err) {
    const code = extractPgErrorCode(err);
    if (code === '23505') {
      return { error: 'alreadyAttached' };
    }
    throw err;
  }
}
