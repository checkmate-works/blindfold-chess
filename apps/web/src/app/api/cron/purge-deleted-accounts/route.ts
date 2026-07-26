import { NextResponse } from 'next/server';

import { requireCronAuth, runCronJob } from '@/lib/cron';
import { purgeDeletedAccounts } from '@/lib/users/purge-deleted-accounts';

/**
 * Daily cron — physically purges accounts soft-deleted longer than the
 * retention window, firing the FK cascade / set-null that finalises the
 * account-deletion policy. See `@/lib/users/purge-deleted-accounts` for the
 * full design, and `@/lib/users/delete-account` for the lifecycle this
 * finishes.
 *
 * Thin shim: auth + error funnel via `@/lib/cron`, same as the other cron
 * routes. Authenticated with the `CRON_SECRET` bearer token (timing-safe
 * compare); runs under the admin client, bypassing RLS by design.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  return runCronJob('Purge deleted accounts', async () => {
    const report = await purgeDeletedAccounts();
    return NextResponse.json({
      message: 'Account purge completed',
      ...report,
    });
  });
}
