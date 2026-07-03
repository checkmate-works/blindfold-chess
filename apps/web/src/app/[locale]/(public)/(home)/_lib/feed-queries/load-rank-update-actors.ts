import { inArray } from 'drizzle-orm';

import { AUTHOR_PROFILE_COLUMNS, db, profiles } from '@/lib/db';

/**
 * The actor profile fields a `challenge_rank_update` feed item
 * surfaces. Lifted out because `ChallengeRankUpdateData['actor']` is
 * inlined into a discriminated union in `../types` and we want a
 * single source of truth for the field set this loader returns.
 */
type RankUpdateActor = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  country: string | null;
  flair: string | null;
};

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
): Promise<Map<string, RankUpdateActor>> {
  const map = new Map<string, RankUpdateActor>();

  if (actorIds.length === 0) return map;

  const actorRows = await db
    .select({
      ...AUTHOR_PROFILE_COLUMNS,
      id: profiles.id,
      country: profiles.country,
      flair: profiles.flair,
    })
    .from(profiles)
    .where(inArray(profiles.id, actorIds));

  for (const actor of actorRows) {
    map.set(actor.id, {
      username: actor.username,
      displayName: actor.displayName,
      avatarUrl: actor.avatarUrl,
      country: actor.country,
      flair: actor.flair,
    });
  }

  return map;
}
