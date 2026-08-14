import 'server-only';

import { getViewerProfile } from '../users/viewer-profile';

/**
 * Check if a user is banned by looking up their profile.
 * Returns `true` if the user has a non-null `bannedAt` timestamp.
 *
 * Delegates to the `React.cache`-wrapped `getViewerProfile`, so the ban
 * check in the protected layout and the profile reads in the layouts/pages
 * beneath it share one `profiles` query per render pass.
 */
export async function isUserBanned(userId: string): Promise<boolean> {
  const profile = await getViewerProfile(userId);
  return profile?.bannedAt != null;
}
