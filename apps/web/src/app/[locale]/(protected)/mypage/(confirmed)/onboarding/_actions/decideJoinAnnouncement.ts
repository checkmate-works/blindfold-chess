'use server';

import type { ActionResult } from '@/lib/action-types';
import { authenticateCheckBanAndRequireProfile } from '@/lib/auth';
import type { JoinAnnouncementOutcome } from '@/lib/feed-items/member-joined-mutations';
import { decideJoinAnnouncement as recordJoinAnnouncementDecision } from '@/lib/feed-items/member-joined-mutations';
import { handleServerActionError } from '@/lib/server-action-error';

export type DecideJoinAnnouncementResult = ActionResult<
  {
    /**
     * What is on record after this call. Normally the answer just given;
     * when another tab or an earlier visit answered first, theirs — the
     * caller shows this, not the button it pressed.
     */
    outcome: JoinAnnouncementOutcome;
  },
  'signInRequired' | 'banned' | 'profileRequired' | 'unexpected_error'
>;

/**
 * Answer the onboarding arrival-announcement step: `announce: true` posts the
 * "〇〇 joined" card to the home feed, `false` declines. Either answer is
 * final — see `decideJoinAnnouncement` in `@/lib/feed-items/member-joined-mutations`.
 * An answer that arrives after the question was already closed is not an
 * error: the step has nothing left to ask, so it gets the recorded outcome.
 *
 * No revalidation: the home feed is a dynamic route that re-queries on the
 * next visit, and the wizard owns the step's state on the client.
 */
export async function decideJoinAnnouncement(input: {
  announce: boolean;
}): Promise<DecideJoinAnnouncementResult> {
  try {
    // The card renders from the member's profile, so a provisional user (no
    // `profiles` row) must not be able to claim the one-shot answer yet.
    const auth = await authenticateCheckBanAndRequireProfile();
    if ('error' in auth) {
      return {
        error:
          auth.error === 'banned' || auth.error === 'profileRequired'
            ? auth.error
            : 'signInRequired',
      };
    }

    const { outcome } = await recordJoinAnnouncementDecision(auth.user.id, input.announce === true);
    return { success: true, outcome };
  } catch (error) {
    handleServerActionError(error, '[decideJoinAnnouncement]');
    return { error: 'unexpected_error' };
  }
}
