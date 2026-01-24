// TODO: Vercel build cannot connect to Supabase database during build time.
// POSTGRES_URL is set in Vercel environment but not available during static build.
// Currently, seeding must be run manually after deployment.
// Consider implementing one of these solutions:
// - Use Vercel's build-time environment variable exposure
// - Run seeding as a post-deployment hook
// - Use Supabase migrations instead of runtime seeding
import { categories, db } from './index';

const categoryData = [
  { slug: 'updates', sortOrder: 1 },
  { slug: 'blog', sortOrder: 2 },
] as const;

async function seed() {
  console.log('Seeding database...');

  for (const category of categoryData) {
    await db
      .insert(categories)
      .values(category)
      .onConflictDoUpdate({
        target: categories.slug,
        set: { sortOrder: category.sortOrder },
      });
  }

  console.log('Seeding complete.');
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
