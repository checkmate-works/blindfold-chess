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
