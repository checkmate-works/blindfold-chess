import type { User } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';

import { db, profiles } from '@/lib/db';
import { loadAvailableTags } from '@/lib/positions/tag-loader';
import type { PositionTagBundle } from '@/lib/positions/tag-loader';
import { resolveAuthorName } from '@/lib/users/display-name';
import { UUID_RE } from '@/lib/validations/uuid';

import type { Locale } from '@/app/[locale]/_lib/types';

type ForkLoader<TSeed> = (params: {
  sourceId: string;
  currentUserId: string;
}) => Promise<TSeed | null>;

/**
 * Shared SSR data-loading for the puzzle / position-memory "new" pages.
 *
 * Resolves the author display name, the optional fork seed (`?from=<id>`),
 * and the available tag bundle. Self-forking is intentionally allowed (see
 * `fork.ts`), so the seed loader runs for any authenticated user regardless
 * of ownership. Guests see the un-seeded form; after they sign in, the SSR
 * re-runs and the seed loads naturally.
 */
export async function loadPositionCreateContext<TSeed>({
  user,
  from,
  locale,
  loadForkSeed,
}: {
  user: User | null;
  from: string | string[] | undefined;
  locale: Locale;
  loadForkSeed: ForkLoader<TSeed>;
}): Promise<{
  displayName: string;
  forkSeed: TSeed | undefined;
  availableTags: PositionTagBundle;
}> {
  let displayName = '';
  if (user) {
    const [profile] = await db
      .select({ displayName: profiles.displayName, username: profiles.username })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);
    displayName = resolveAuthorName(profile, { fallback: '' });
  }

  const sourceId = typeof from === 'string' ? from : undefined;
  let forkSeed: TSeed | undefined = undefined;
  if (sourceId && user && UUID_RE.test(sourceId)) {
    const loaded = await loadForkSeed({ sourceId, currentUserId: user.id });
    if (loaded) forkSeed = loaded;
  }

  const availableTags = await loadAvailableTags(locale);

  return { displayName, forkSeed, availableTags };
}
