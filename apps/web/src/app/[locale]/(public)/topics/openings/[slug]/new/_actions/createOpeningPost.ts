'use server';

import { redirect } from 'next/navigation';

import { logActivityEvent } from '@/lib/activity-log';
import { isUserBanned } from '@/lib/ban';
import { db, topicPostRatings, topicPosts } from '@/lib/db';
import { checkRateLimit, createOpeningPostRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

import { isValidOpening } from '../../../_lib/queries';

const MAX_CONTENT_LENGTH = 5000;

type CreateOpeningPostState = {
  error?: string;
};

export async function createOpeningPost(
  locale: string,
  slug: string,
  _prevState: CreateOpeningPostState,
  formData: FormData
): Promise<CreateOpeningPostState> {
  if (!(await isValidOpening(slug))) {
    return { error: 'invalidOpening' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'signInRequired' };
  }

  if (await isUserBanned(user.id)) {
    return { error: 'banned' };
  }

  const content = formData.get('content');
  const preferenceRatingRaw = formData.get('preferenceRating');
  const proficiencyRatingRaw = formData.get('proficiencyRating');

  const contentStr = typeof content === 'string' ? content.trim() : '';
  const preferenceRating = parseRating(preferenceRatingRaw);
  const proficiencyRating = parseRating(proficiencyRatingRaw);

  const hasContent = contentStr.length > 0;
  const hasRating = preferenceRating !== null || proficiencyRating !== null;

  if (!hasContent && !hasRating) {
    return { error: 'contentOrRatingRequired' };
  }

  if (contentStr.length > MAX_CONTENT_LENGTH) {
    return { error: 'contentTooLong' };
  }

  // Rate limit check runs after validation so a failed submission does not consume the event.
  const rateLimitResult = await checkRateLimit(user.id, createOpeningPostRateLimit(slug));
  if ('error' in rateLimitResult) {
    return { error: rateLimitResult.error };
  }

  const inserted = await db.transaction(async (tx) => {
    const [post] = await tx
      .insert(topicPosts)
      .values({
        userId: user.id,
        topicType: 'opening',
        topicKey: slug,
        content: contentStr,
      })
      .returning({ id: topicPosts.id });

    if (hasRating) {
      await tx.insert(topicPostRatings).values({
        postId: post.id,
        preferenceRating,
        proficiencyRating,
      });
    }

    return post;
  });

  logActivityEvent({
    userId: user.id,
    action: 'create_post',
    targetType: 'topic_post',
    targetId: inserted.id,
    metadata: { topicType: 'opening', topicKey: slug },
  });

  redirect(`/${locale}/topics/openings/${slug}?toast=post_created`);
}

function parseRating(value: FormDataEntryValue | null): number | null {
  if (value === null || typeof value !== 'string') return null;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 5) return null;
  return num;
}
