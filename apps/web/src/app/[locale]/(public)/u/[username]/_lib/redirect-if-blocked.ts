import { redirect } from 'next/navigation';

import 'server-only';

import { isBlockedBetween } from '@/lib/moderation/block';
import { createClient } from '@/lib/supabase/server';

/**
 * The profile sub-pages (followers / achievements) have no restricted view of
 * their own. When a block exists in either direction, send the blocked viewer
 * back to the main profile, which renders the single "content hidden" notice.
 * No-op for anonymous viewers and for the profile owner themselves.
 */
export async function redirectIfBlockedFromProfile(params: {
  locale: string;
  username: string;
  profileId: string;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id === params.profileId) return;
  if (await isBlockedBetween(user.id, params.profileId)) {
    redirect(`/${params.locale}/u/${params.username}`);
  }
}
