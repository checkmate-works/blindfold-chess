/**
 * Database seed script
 *
 * Seeding strategy:
 * - Master data (glossary) → onConflictDoUpdate (upsert)
 *   Overwritten with the latest code data on every deploy. Code is the source of truth.
 * - Initial data (ad_banners) → onConflictDoNothing
 *   Inserted only on first run; DB is the source of truth afterward.
 *   Values modified via admin UI are never overwritten.
 *
 * This distinction mirrors the seed() (always update) vs seed_once() (first-time only)
 * pattern from Rails' seed-fu gem. In the Drizzle / Prisma / RedwoodJS community,
 * using the ORM's built-in upsert capabilities directly is the mainstream approach
 * for master data seeding.
 *
 * The actual seed logic is split into per-domain modules under `./seed/`.
 * This file is a thin orchestrator that runs them in dependency order.
 */
import { seedAchievements } from './seed/achievements';
import { seedAds } from './seed/ads';
import { seedArticleCategories } from './seed/article-categories';
import { seedGlossaryTerms } from './seed/glossary';
import { seedChessOpenings } from './seed/openings';
import { seedRanks } from './seed/ranks';

async function seed() {
  console.log('Seeding database...');

  await seedGlossaryTerms();
  await seedArticleCategories();
  await seedChessOpenings();
  await seedRanks();
  await seedAchievements();
  await seedAds();

  console.log('Seeding complete.');
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
