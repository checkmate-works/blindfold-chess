import { asc, eq, lte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { ranks, userRanks } from '../../src/lib/db/schema';

/**
 * Grants a seed user every rank up to and including `targetSlug`.
 *
 * Exists so the belt progression can be exercised from a known rung without
 * grinding the prior ranks: `checkAndGrantRanks` stops at the first unmet rank,
 * so a fresh user is always blocked far below whichever condition you actually
 * want to test.
 *
 * Writes `user_ranks` directly rather than going through `checkAndGrantRanks` —
 * the point is to arrive at the rung WITHOUT satisfying the conditions. The
 * table is INSERT-only achievement history, so this mirrors what a real grant
 * leaves behind; `onConflictDoNothing` keeps re-runs idempotent.
 *
 * Depends on `pnpm db:seed` having populated `ranks` first.
 */
export async function grantRanksUpTo(
  db: PostgresJsDatabase,
  userId: string,
  targetSlug: string
): Promise<string[]> {
  const [target] = await db.select().from(ranks).where(eq(ranks.slug, targetSlug)).limit(1);
  if (!target) {
    throw new Error(
      `dev-seed: rank "${targetSlug}" is not in the ranks table — run \`pnpm db:seed\` first.`
    );
  }

  const upTo = await db
    .select()
    .from(ranks)
    .where(lte(ranks.level, target.level))
    .orderBy(asc(ranks.level));

  await db
    .insert(userRanks)
    .values(upTo.map((rank) => ({ userId, rankId: rank.id })))
    .onConflictDoNothing({ target: [userRanks.userId, userRanks.rankId] });

  return upTo.map((rank) => rank.slug);
}
