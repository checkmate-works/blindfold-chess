import { and, eq } from 'drizzle-orm';

import { adCreativeTranslations, db } from '@/lib/db';

/**
 * The ids of every creative whose English title is `title`, as a subquery —
 * one book's rows across all the slots it runs in. See
 * `groupCreativesByTitle` for why the English title is the key.
 *
 * The bulk actions take the title and look the rows up again with this
 * rather than taking ids from the client, so a creative added or retitled
 * since the page loaded is included or left out by what the database says
 * now.
 */
export function creativeIdsWithEnglishTitle(title: string) {
  return db
    .select({ id: adCreativeTranslations.creativeId })
    .from(adCreativeTranslations)
    .where(and(eq(adCreativeTranslations.locale, 'en'), eq(adCreativeTranslations.title, title)));
}
