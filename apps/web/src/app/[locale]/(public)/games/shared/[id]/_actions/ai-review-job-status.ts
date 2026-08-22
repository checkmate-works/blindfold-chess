'use server';

import { getAiReviewJobStatus } from '@/lib/ai-review/jobs';
import type { AiReviewJobStatusResponse } from '@/lib/ai-review/types';
import { authenticateAndCheckBan } from '@/lib/auth';
import { handleServerActionError } from '@/lib/server-action-error';
import { UUID_RE } from '@/lib/validations/uuid';

/**
 * Poll a review job the viewer requested (`requestAiReviewAction`), so the
 * page can swap the "accepted" notice for the review without a reload. The
 * notification is the durable signal; this is the convenience for an author
 * who stays on the page. Scoped to the caller — a job id alone reveals nothing.
 */
export async function getAiReviewJobStatusAction(
  jobId: string
): Promise<AiReviewJobStatusResponse> {
  try {
    if (!UUID_RE.test(jobId)) return { status: 'not_found' };
    const auth = await authenticateAndCheckBan();
    if ('error' in auth) return { status: 'not_found' };
    return await getAiReviewJobStatus(jobId, auth.user.id);
  } catch (error) {
    handleServerActionError(error, '[getAiReviewJobStatusAction]');
    return { status: 'pending' };
  }
}
