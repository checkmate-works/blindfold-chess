'use server';

import { createClient } from '@supabase/supabase-js';

import { getAuthenticatedUser } from '@/lib/auth';
import { RATE_LIMITS, checkRateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { passwordSchema } from '@/lib/validations/password';

export type ChangePasswordResult = { success: true } | { error: string };

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

  const validation = passwordSchema.safeParse(newPassword);
  if (!validation.success) {
    return { error: 'passwordInvalid' };
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
    return { error: 'updateFailed' };
  }

  return { success: true };
}
