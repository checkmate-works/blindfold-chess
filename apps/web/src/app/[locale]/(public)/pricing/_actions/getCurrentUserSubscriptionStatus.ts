'use server';

import { getOptionalUser } from '@/lib/auth';
import { hasActiveSubscription } from '@/lib/billing/subscription';

/**
 * Return whether the currently-signed-in user has an active subscription, or
 * `false` for anonymous visitors. Used by the ISR-cached pricing page to
 * overlay per-user "Current Plan" / CTA state on top of the otherwise-static
 * plan cards.
 */
export async function getCurrentUserSubscriptionStatus(): Promise<{
  isAuthenticated: boolean;
  isSubscribed: boolean;
}> {
  const user = await getOptionalUser();
  if (!user) return { isAuthenticated: false, isSubscribed: false };
  const isSubscribed = await hasActiveSubscription(user.id);
  return { isAuthenticated: true, isSubscribed };
}
