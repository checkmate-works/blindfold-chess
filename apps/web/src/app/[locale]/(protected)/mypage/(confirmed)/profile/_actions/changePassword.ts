'use server';

import { createClient } from '@supabase/supabase-js';

import type { ActionResult } from '@/lib/action-types';
import { getAuthenticatedUser } from '@/lib/auth';
import { RATE_LIMITS, checkRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { logActivityEvent } from '@/lib/users/activity-log';
import { getPasswordValidationError } from '@/lib/validations/password';

export type ChangePasswordResult = ActionResult;

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResult> {
  const user = await getAuthenticatedUser();

  if (!user.email) {
    return { error: 'noEmail' };
  }

  const isEmailProvider = user.app_metadata.providers?.includes('email');
  if (!isEmailProvider) {
    return { error: 'notEmailAuth' };
  }

  const passwordError = getPasswordValidationError(newPassword);
  if (passwordError) {
    return { error: `password:${passwordError}` };
  }

  if (currentPassword === newPassword) {
    return { error: 'passwordSameAsCurrent' };
  }

  const rateLimitResult = await checkRateLimit(user.id, RATE_LIMITS.changePassword);
  if ('error' in rateLimitResult) {
    return { error: 'rateLimited' };
  }

  // Verify current password using a stateless client (no session persistence)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return { error: 'currentPasswordIncorrect' };
  }

  // Update password via Admin API to avoid session side effects
  const adminClient = createAdminClient();
  const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });

  if (updateError) {
    if (updateError.code === 'weak_password') {
      return { error: 'password:weak' };
    }
    return { error: 'updateFailed' };
  }

  logActivityEvent({
    userId: user.id,
    action: 'change_password',
    targetType: 'user',
    targetId: user.id,
  });

  return { success: true };
}
