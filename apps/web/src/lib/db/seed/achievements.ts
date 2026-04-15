import { achievementsSeedData } from '../data/achievements';
import { achievements, db } from '../index';

// ---------------------------------------------------------------------------
// Master data: Achievements (code is source of truth, inserted with conflict skip)
// ---------------------------------------------------------------------------

export async function seedAchievements() {
  console.log(`Seeding ${achievementsSeedData.length} achievements...`);

  for (const achievement of achievementsSeedData) {
    await db
      .insert(achievements)
      .values({
        slug: achievement.slug,
        category: achievement.category,
        iconKey: achievement.iconKey,
        criteria: achievement.criteria,
        displayOrder: achievement.displayOrder,
        repeatable: achievement.repeatable,
      })
      .onConflictDoNothing({ target: achievements.slug });
  }
}
