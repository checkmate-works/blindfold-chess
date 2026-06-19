import { redirect } from 'next/navigation';

import type { User } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';

import { db, positions, profiles } from '@/lib/db';
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
 * and the available tag bundle. Self-fork attempts are bounced to the
 * source's detail page (its Edit affordance) — the segment determines that
 * redirect target and the seed loader is the per-feature one. Guests see
 * the un-seeded form; after they sign in, the SSR re-runs and the seed
 * loads naturally.
 */
export async function loadPositionCreateContext<TSeed>({
  user,
  from,
  locale,
  segment,
  loadForkSeed,
}: {
  user: User | null;
  from: string | string[] | undefined;
  locale: Locale;
  segment: 'puzzle' | 'position-memory';
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
    const [ownerRow] = await db
      .select({ userId: positions.userId })
      .from(positions)
      .where(eq(positions.id, sourceId))
      .limit(1);
    if (ownerRow?.userId === user.id) {
      redirect(`/${locale}/practice/${segment}/${sourceId}`);
    }
    const loaded = await loadForkSeed({ sourceId, currentUserId: user.id });
    if (loaded) forkSeed = loaded;
  }

  const availableTags = await loadAvailableTags(locale);

  return { displayName, forkSeed, availableTags };
}
