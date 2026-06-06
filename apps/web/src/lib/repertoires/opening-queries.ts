import { getTranslations } from 'next-intl/server';

import { asc } from 'drizzle-orm';

import { chessOpenings, db } from '@/lib/db';

/** An opening option for the repertoire import picker. */
export type OpeningOption = {
  id: string;
  slug: string;
  name: string;
  ecoCode: string;
  /** Localised display name (falls back to the English `name`). */
  translatedName: string;
};

/**
 * All openings from the `chess_openings` master, ordered for display, with
 * localised names. Used to populate the opening picker when a repertoire's
 * phase is `opening`. Mirrors the translate-with-fallback pattern in
 * `games/new/opening`.
 */
export async function getOpeningOptions(locale: string): Promise<OpeningOption[]> {
  const tNames = await getTranslations({ locale, namespace: 'topics.openings.names' });

  const rows = await db
    .select({
      id: chessOpenings.id,
      slug: chessOpenings.slug,
      name: chessOpenings.name,
      ecoCode: chessOpenings.ecoCode,
    })
    .from(chessOpenings)
    .orderBy(asc(chessOpenings.sortOrder));

  return rows.map((o) => ({
    ...o,
    translatedName: tNames.has(o.slug as never) ? tNames(o.slug as never) : o.name,
  }));
}
