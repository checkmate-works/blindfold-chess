import { not, sql } from 'drizzle-orm';

import { ranksSeedData } from '../data/ranks';
import { db, ranks } from '../index';

// ---------------------------------------------------------------------------
// Master data: Ranks (code is source of truth, upserted on every deploy)
// ---------------------------------------------------------------------------

export async function seedRanks() {
  console.log(`Seeding ${ranksSeedData.length} ranks...`);

  const validSlugs: string[] = [];

  for (const rank of ranksSeedData) {
    await db
      .insert(ranks)
      .values({
        slug: rank.slug,
        level: rank.level,
        color: rank.color,
        requirements: rank.requirements,
      })
      .onConflictDoUpdate({
        target: ranks.slug,
        set: {
          level: rank.level,
          color: rank.color,
          requirements: rank.requirements,
        },
      });

    validSlugs.push(rank.slug);
  }

  // Clean up ranks removed from code data source
  if (validSlugs.length > 0) {
    const slugValues = validSlugs.map((s) => sql`${s}`);
    await db.delete(ranks).where(not(sql`${ranks.slug} IN (${sql.join(slugValues, sql`, `)})`));
  }
}
