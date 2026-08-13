import { inArray } from 'drizzle-orm';

import { SOCIAL_AUTHOR_COLUMNS, db, profiles } from '@/lib/db';
import type { SocialAuthorProfile } from '@/lib/users/author-profile';

/**
 * Bulk-load the actor profiles referenced by `challenge_rank_update`
 * feed rows. Returns `Map<actorId, profile>` keyed by user id so the
 * orchestrator can attach the actor to each rank-update feed item.
 *
 * Profiles that have since been deleted are silently dropped — the
 * orchestrator already skips rank updates whose actor lookup misses,
 * matching the "entity disappeared" handling used elsewhere in the
 * feed loader.
 */
export async function loadRankUpdateActors(
  actorIds: string[]
): Promise<Map<string, SocialAuthorProfile>> {
  const map = new Map<string, SocialAuthorProfile>();

  if (actorIds.length === 0) return map;

  const actorRows = await db
    .select({ ...SOCIAL_AUTHOR_COLUMNS, id: profiles.id })
    .from(profiles)
    .where(inArray(profiles.id, actorIds));

  for (const { id, ...actor } of actorRows) {
    map.set(id, actor);
  }

  return map;
}
