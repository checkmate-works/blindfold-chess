import { eq } from 'drizzle-orm';

import { chessTerms } from './data/chess-terms';
import {
  categories,
  db,
  glossaryTermAliases,
  glossaryTermTranslations,
  glossaryTerms,
} from './index';

const categoryData = [
  { slug: 'updates', sortOrder: 1 },
  { slug: 'blog', sortOrder: 2 },
] as const;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

async function seedCategories() {
  for (const category of categoryData) {
    await db
      .insert(categories)
      .values(category)
      .onConflictDoUpdate({
        target: categories.slug,
        set: { sortOrder: category.sortOrder },
      });
  }
}

async function seedGlossaryTerms() {
  console.log(`Seeding ${chessTerms.length} glossary terms...`);

  for (const chessTerm of chessTerms) {
    const slug = slugify(chessTerm.term);
    const category = chessTerm.category || 'general';

    // Upsert glossary term (idempotent on slug)
    const [term] = await db
      .insert(glossaryTerms)
      .values({ slug, termEn: chessTerm.term, category })
      .onConflictDoUpdate({
        target: glossaryTerms.slug,
        set: { termEn: chessTerm.term, category, updatedAt: new Date() },
      })
      .returning({ id: glossaryTerms.id });

    // Upsert Japanese translation (idempotent on term_id + locale)
    await db
      .insert(glossaryTermTranslations)
      .values({
        termId: term.id,
        locale: 'ja',
        term: chessTerm.termJa || chessTerm.term,
        definition: chessTerm.definition,
        reading: chessTerm.reading || null,
      })
      .onConflictDoUpdate({
        target: [glossaryTermTranslations.termId, glossaryTermTranslations.locale],
        set: {
          term: chessTerm.termJa || chessTerm.term,
          definition: chessTerm.definition,
          reading: chessTerm.reading || null,
          updatedAt: new Date(),
        },
      });

    // Upsert English translation (idempotent on term_id + locale)
    await db
      .insert(glossaryTermTranslations)
      .values({
        termId: term.id,
        locale: 'en',
        term: chessTerm.term,
        definition: chessTerm.definitionEn || chessTerm.definition,
      })
      .onConflictDoUpdate({
        target: [glossaryTermTranslations.termId, glossaryTermTranslations.locale],
        set: {
          term: chessTerm.term,
          definition: chessTerm.definitionEn || chessTerm.definition,
          updatedAt: new Date(),
        },
      });

    // Aliases: delete existing + re-insert (no unique constraint to upsert on)
    await db.delete(glossaryTermAliases).where(eq(glossaryTermAliases.termId, term.id));

    if (chessTerm.aliases && chessTerm.aliases.length > 0) {
      await db.insert(glossaryTermAliases).values(
        chessTerm.aliases.map((alias) => ({
          termId: term.id,
          alias,
        }))
      );
    }
  }
}

async function seed() {
  console.log('Seeding database...');

  await seedCategories();
  await seedGlossaryTerms();

  console.log('Seeding complete.');
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
