'use server';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndCheckBan } from '@/lib/auth';
import { decideJoinAnnouncement as recordJoinAnnouncementDecision } from '@/lib/feed-items/member-joined-mutations';
import { handleServerActionError } from '@/lib/server-action-error';

export type DecideJoinAnnouncementResult = ActionResult<
  Record<never, never>,
  'signInRequired' | 'banned' | 'alreadyDecided' | 'unexpected_error'
>;

/**
 * Answer the onboarding arrival-announcement step: `announce: true` posts the
 * "〇〇 joined" card to the home feed, `false` declines. Either answer is
 * final — see `decideJoinAnnouncement` in `@/lib/feed-items/member-joined-mutations`.
 *
 * No revalidation: the home feed is a dynamic route that re-queries on the
 * next visit, and the wizard owns the step's state on the client.
 */
export async function decideJoinAnnouncement(input: {
  announce: boolean;
}): Promise<DecideJoinAnnouncementResult> {
  try {
    const auth = await authenticateAndCheckBan();
    if ('error' in auth) {
      return { error: auth.error === 'banned' ? 'banned' : 'signInRequired' };
    }

    const recorded = await recordJoinAnnouncementDecision(auth.user.id, input.announce === true);
    return recorded ? { success: true } : { error: 'alreadyDecided' };
  } catch (error) {
    handleServerActionError(error, '[decideJoinAnnouncement]');
    return { error: 'unexpected_error' };
  }
}
