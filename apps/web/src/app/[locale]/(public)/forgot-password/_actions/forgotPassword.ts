'use server';

import { SITE_URL } from '@/config';

import type { ActionResult } from '@/lib/action-types';
import { getOptionalUser } from '@/lib/auth';
import { consumeEmailRateLimit, guardByIpRateLimit } from '@/lib/security/rate-limit-ip';
import { createClient } from '@/lib/supabase/server';
import { logActivityEvent } from '@/lib/users/activity-log';
import { isValidEmail } from '@/lib/validations/email';

export type ForgotPasswordResult = ActionResult;

export async function forgotPassword(email: string): Promise<ForgotPasswordResult> {
  const ipRateLimited = await guardByIpRateLimit('forgotPassword');
  if (ipRateLimited) {
    return ipRateLimited;
  }

  if (!isValidEmail(email)) {
    return { error: 'resetFailed' };
  }

  // Per-email ceiling (EMAIL_RATE_LIMITS.forgotPassword). The IP guard above
  // does not stop someone rotating IPs from flooding one inbox with reset
  // mail, so each address also gets its own bucket. When it is full the email
  // is not sent, and the caller still gets the same `{ success: true }`.
  //
  // Why the suppression is silent rather than a visible "too many requests":
  // - The bucket fills the same way for registered and unregistered
  //   addresses, so a visible error would not by itself say which addresses
  //   have accounts. But the endpoint's defence against enumeration is that
  //   any well-formed address gets exactly one answer. A second, per-address
  //   answer would become an oracle the moment anything made the bucket fill
  //   differently for the two kinds; with one answer there is nothing to leak.
  // - Anyone filling a victim's bucket on purpose, to block their recovery,
  //   gets no confirmation that it worked or of when the window resets.
  //
  // Silence does not remove that lockout; it only stops advertising it. The
  // bucket cannot tell the victim's requests from an attacker's before
  // sign-in, so submitting the victim's address at the bucket's rate keeps
  // suppressing their own requests. It is bounded by a refused attempt
  // recording nothing: the bucket empties one window after the attacker
  // stops. A visible error would not help the victim here, since their only
  // recourse (wait and retry) is the same either way.
  //
  // Timing is not equalised: skipping the Supabase call makes a suppressed
  // request return sooner. That leaks only that this address was already
  // requested several times this window, which says nothing about whether it
  // has an account.
  //
  // Runs after validation so that malformed input never consumes a slot.
  const withinEmailLimit = await consumeEmailRateLimit('forgotPassword', email);
  if (!withinEmailLimit) {
    // Without this line a suppression is invisible to operators as well as to
    // the caller. The address stays out of it: it is PII, and the count of
    // these lines is what shows a flood.
    console.info('[forgotPassword] per-email limit reached; reset email suppressed');
    return { success: true };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?type=recovery`,
  });

  // Always fall through regardless of error to prevent account enumeration.
  // Returning a distinct error when the email doesn't exist would let an
  // attacker probe which addresses are registered.

  // Log the password reset request if a session exists (e.g. user is already
  // signed in and requests a reset). In the typical unauthenticated flow,
  // userId will be null and we skip logging because user_activity_log.user_id
  // is NOT NULL.
  const user = await getOptionalUser();
  if (user) {
    logActivityEvent({
      userId: user.id,
      action: 'request_password_reset',
    });
  }

  return { success: true };
}
