import { NextResponse } from 'next/server';

import { sweepAiReviewJobs } from '@/lib/ai-review/jobs';
import { requireCronAuth, runCronJob } from '@/lib/cron';

/**
 * Every few minutes — re-runs or refunds AI review jobs that `after()` left
 * behind (see `@/lib/ai-review/jobs`). Scheduled in `vercel.json`;
 * authenticated via the `CRON_SECRET` bearer token like the other cron routes.
 *
 * Each stale job is one LLM call, so the route needs more than the app-wide
 * 60s; the sweep is batch-limited to fit comfortably inside this.
 */
export const maxDuration = 300;

export async function GET(request: Request): Promise<NextResponse> {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  return runCronJob('Sweep AI review jobs', async () => {
    const result = await sweepAiReviewJobs();
    return NextResponse.json({ message: 'AI review jobs swept', ...result });
  });
}
