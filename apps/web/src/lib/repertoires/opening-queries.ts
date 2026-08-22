import { getTranslations } from 'next-intl/server';

import { asc, eq } from 'drizzle-orm';

import { chessOpenings, db, repertoireOpenings } from '@/lib/db';
import { getOpenings } from '@/lib/openings/master-queries';

/** An opening option for the repertoire import picker. */
export type OpeningOption = {
  id: string;
  slug: string;
  name: string;
  ecoCode: string;
  /** Signature position — lets the picker detect openings from a pasted PGN. */
  fen: string;
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

  const rows = await getOpenings();

  return rows.map((o) => ({
    id: o.id,
    slug: o.slug,
    name: o.name,
    ecoCode: o.ecoCode,
    fen: o.fen,
    translatedName: tNames.has(o.slug as never) ? tNames(o.slug as never) : o.name,
  }));
}

/**
 * The opening ids currently linked to a repertoire (n:n). Prefills the picker on
 * the edit page; the link rows are the source of truth, so there is nothing to
 * derive from the PGN here.
 */
export async function getLinkedOpeningIds(repertoireId: string): Promise<string[]> {
  const rows = await db
    .select({ openingId: repertoireOpenings.openingId })
    .from(repertoireOpenings)
    .where(eq(repertoireOpenings.repertoireId, repertoireId));

  return rows.map((r) => r.openingId);
}

/** A linked opening, shaped for `OpeningCard` (board thumbnail + ECO + PGN). */
export type LinkedOpening = {
  id: string;
  slug: string;
  name: string;
  ecoCode: string;
  fen: string;
  pgn: string;
};

/**
 * The openings linked to a repertoire, with everything `OpeningCard` renders.
 * Used by the detail page to link out to each opening's topic page; ordered by
 * the master's own `sort_order` so the primary opening leads (the same order
 * the thumbnail picker uses).
 */
export async function getLinkedOpenings(repertoireId: string): Promise<LinkedOpening[]> {
  return db
    .select({
      id: chessOpenings.id,
      slug: chessOpenings.slug,
      name: chessOpenings.name,
      ecoCode: chessOpenings.ecoCode,
      fen: chessOpenings.fen,
      pgn: chessOpenings.pgn,
    })
    .from(repertoireOpenings)
    .innerJoin(chessOpenings, eq(chessOpenings.id, repertoireOpenings.openingId))
    .where(eq(repertoireOpenings.repertoireId, repertoireId))
    .orderBy(asc(chessOpenings.sortOrder));
}
