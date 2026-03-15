import { eq } from 'drizzle-orm';

import { articleCategories, articleCategoryTranslations, db } from '@/lib/db';

export async function getArticleCategories() {
  return db
    .select({
      id: articleCategories.id,
      name: articleCategoryTranslations.name,
    })
    .from(articleCategories)
    .innerJoin(
      articleCategoryTranslations,
      eq(articleCategoryTranslations.categoryId, articleCategories.id)
    )
    .where(eq(articleCategoryTranslations.locale, 'en'))
    .orderBy(articleCategories.displayOrder);
}
