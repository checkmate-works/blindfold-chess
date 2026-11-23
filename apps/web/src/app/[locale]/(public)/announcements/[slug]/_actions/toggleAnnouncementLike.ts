'use server';

import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';

import { authenticateGuardAndRequireProfile } from '@/lib/auth';
import { ANNOUNCEMENT_LIKE_TARGET, toggleAnnouncementLike } from '@/lib/db/announcement-likes';
import type { ToggleLikeResult } from '@/lib/db/like-actions';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { handleServerActionError } from '@/lib/server-action-error';
import { logActivityEvent } from '@/lib/users/activity-log';

import { getPublishedAnnouncement } from '../../_lib/queries';

/**
 * Like / unlike a published announcement. The like counts toward the slug
 * (every locale variant together — see `@/lib/db/announcement-likes`), and
 * notifies nobody: the author is the operators, who read the totals in admin.
 *
 * No `revalidatePath`: the detail page is `force-dynamic` and the button
 * updates its count optimistically (rationale on `performEntityToggleLike`).
 */
export async function toggleAnnouncementLikeAction(
  slug: string,
  locale: string
): Promise<ToggleLikeResult> {
  try {
    assertSupportedLocale(locale);

    const guardResult = await authenticateGuardAndRequireProfile(RATE_LIMITS.toggleLike);
    if ('error' in guardResult) return { error: guardResult.error };
    const { user } = guardResult;

    // Only a published announcement can be liked; drafts and unknown slugs
    // would otherwise collect likes nobody can see.
    const published = await getPublishedAnnouncement(slug, locale);
    if (!published) return { error: 'notFound' };

    const { liked, likeCount } = await toggleAnnouncementLike({
      userId: user.id,
      slug,
      displayedVariantId: published.announcement.id,
    });

    logActivityEvent({
      userId: user.id,
      action: liked ? 'like' : 'unlike',
      targetType: ANNOUNCEMENT_LIKE_TARGET,
      targetId: published.announcement.id,
    });

    return { liked, likeCount };
  } catch (error) {
    return handleServerActionError(error, '[toggleAnnouncementLikeAction]');
  }
}
