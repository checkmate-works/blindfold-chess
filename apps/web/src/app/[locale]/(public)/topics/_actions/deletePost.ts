'use server';

import { revalidatePath } from 'next/cache';

import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { createClient as createSupabaseSessionClient } from '@/lib/supabase/server';
import { loadAuthoredPost } from '@/lib/topic-posts';
import {
  deletePostCore,
  purgePostImageAttachmentsFromStorage,
} from '@/lib/topic-posts/delete-core';
import { logActivityEvent } from '@/lib/users/activity-log';

import { buildTopicDetailPath } from '../_lib/topic-paths';

export type DeletePostResult = ActionResult;

export async function deletePost(postId: string, locale: string): Promise<DeletePostResult> {
  assertSupportedLocale(locale);

  const guardResult = await authenticateAndGuard(RATE_LIMITS.deletePost);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  const lookup = await loadAuthoredPost(postId, user.id);
  if ('error' in lookup) {
    return { error: lookup.error };
  }
  const { post } = lookup;

  const supabase = await createSupabaseSessionClient();
  await purgePostImageAttachmentsFromStorage(postId, supabase, 'deletePost');

  // `requireNotDeleted: true` makes the soft-delete idempotent: a stale
  // tab that re-submits the action lands on a no-op write rather than
  // re-stamping `deletedAt`.
  await deletePostCore(postId, user.id, { requireNotDeleted: true });

  logActivityEvent({
    userId: user.id,
    action: 'delete_post',
    targetType: 'topic_post',
    targetId: postId,
    metadata: { topicType: post.topicType, topicKey: post.topicKey },
  });

  revalidatePath(buildTopicDetailPath(post.topicType, post.topicKey, locale));

  return { success: true };
}
