'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import { authenticateAndGuard } from '@/lib/auth';
import { db, postGamePgnAttachments, topicPosts } from '@/lib/db';
import {
  buildPgnAttachmentValues,
  pgnAttachmentErrorKey,
} from '@/lib/games/build-pgn-attachment-values';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';

import { buildTopicDetailPath } from '../_lib/topic-paths';

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
  locale: string,
  formData: FormData
): Promise<AttachPostPgnResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.attachPostPgn);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  const [post] = await db
    .select({
      id: topicPosts.id,
      userId: topicPosts.userId,
      topicType: topicPosts.topicType,
      topicKey: topicPosts.topicKey,
      deletedAt: topicPosts.deletedAt,
    })
    .from(topicPosts)
    .where(eq(topicPosts.id, postId))
    .limit(1);

  if (!post) return { error: 'notFound' };
  if (post.userId !== user.id) return { error: 'unauthorized' };
  if (post.deletedAt) return { error: 'alreadyDeleted' };

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

    logActivityEvent({
      userId: user.id,
      action: 'attach_post_pgn',
      targetType: 'topic_post',
      targetId: postId,
      metadata: {
        topicType: post.topicType,
        topicKey: post.topicKey,
        attachmentId: row.id,
        source: built.values.source,
      },
    });

    revalidatePath(buildTopicDetailPath(post.topicType, post.topicKey, locale));

    return {
      success: true,
      attachment: { id: row.id, createdAt: row.createdAt },
    };
  } catch (err) {
    const code = pgCode(err);
    if (code === '23505') {
      return { error: 'alreadyAttached' };
    }
    throw err;
  }
}

function pgCode(err: unknown): string | undefined {
  return err instanceof Error && 'code' in err
    ? (err as Error & { code?: string }).code
    : undefined;
}
