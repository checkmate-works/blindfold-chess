import { articleCategories, articleCategoryTranslations, db } from '../index';

// ---------------------------------------------------------------------------
// Master data: Article Categories (code is source of truth, upserted on every deploy)
// ---------------------------------------------------------------------------

const CATEGORY_SEED_DATA = [
  {
    slug: 'notation',
    displayOrder: 1,
    translations: { en: 'Notation', ja: '記法' },
  },
  {
    slug: 'coordinates',
    displayOrder: 2,
    translations: { en: 'Coordinates', ja: '座標' },
  },
  {
    slug: 'moves',
    displayOrder: 3,
    translations: { en: 'Piece Movement', ja: '駒の動き' },
  },
  {
    slug: 'memory',
    displayOrder: 4,
    translations: { en: 'Memory', ja: '記憶' },
  },
  {
    slug: 'practice',
    displayOrder: 5,
    translations: { en: 'Practice', ja: '練習' },
  },
] as const;

export async function seedArticleCategories() {
  console.log('Seeding article categories...');

  for (const cat of CATEGORY_SEED_DATA) {
    // Upsert category (idempotent on slug)
    const [category] = await db
      .insert(articleCategories)
      .values({ slug: cat.slug, displayOrder: cat.displayOrder })
      .onConflictDoUpdate({
        target: articleCategories.slug,
        set: { displayOrder: cat.displayOrder },
      })
      .returning({ id: articleCategories.id });

    // Upsert translations for each locale
    for (const [locale, name] of Object.entries(cat.translations)) {
      await db
        .insert(articleCategoryTranslations)
        .values({ categoryId: category.id, locale, name })
        .onConflictDoUpdate({
          target: [articleCategoryTranslations.categoryId, articleCategoryTranslations.locale],
          set: { name, updatedAt: new Date() },
        });
    }
  }
}
