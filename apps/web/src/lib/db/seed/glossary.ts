import { not, sql } from 'drizzle-orm';

import { EMPTY_BOARD_ANNOTATIONS } from '@/lib/board-annotations/types';

import { chessTerms } from '../data/chess-terms';
import {
  db,
  glossaryTermAliases,
  glossaryTermPositions,
  glossaryTermTranslations,
  glossaryTerms,
} from '../index';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// ---------------------------------------------------------------------------
// Master data: Glossary (code is source of truth, upserted on every deploy)
// ---------------------------------------------------------------------------

export async function seedGlossaryTerms() {
  console.log(`Seeding ${chessTerms.length} glossary terms...`);

  // Collect valid pairs for orphaned-record cleanup after upsert
  const validAliases: { termId: string; alias: string }[] = [];
  const validPositions: { termId: string; fen: string }[] = [];

  for (const chessTerm of chessTerms) {
    const slug = slugify(chessTerm.term);
    const category = chessTerm.category || 'general';
    const isTheme = chessTerm.isTheme ?? false;

    // Upsert term (idempotent on slug)
    const [term] = await db
      .insert(glossaryTerms)
      .values({ slug, termEn: chessTerm.term, category, isTheme })
      .onConflictDoUpdate({
        target: glossaryTerms.slug,
        set: { termEn: chessTerm.term, category, isTheme, updatedAt: new Date() },
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

    // Upsert aliases (idempotent on term_id + alias unique constraint)
    if (chessTerm.aliases && chessTerm.aliases.length > 0) {
      for (const alias of chessTerm.aliases) {
        await db
          .insert(glossaryTermAliases)
          .values({ termId: term.id, alias })
          .onConflictDoNothing({
            target: [glossaryTermAliases.termId, glossaryTermAliases.alias],
          });
        validAliases.push({ termId: term.id, alias });
      }
    }

    // Upsert positions (idempotent on term_id + fen unique constraint).
    //
    // `annotations` is INTENTIONALLY excluded from the conflict UPDATE
    // set: it is admin-managed via `/admin/glossary/[slug]`, and
    // overwriting it on every seed run would let a code-only deploy
    // silently clobber curated arrows and circles. Code's optional
    // `pos.annotations` is therefore a one-time bootstrap value used on
    // INSERT and ignored on UPDATE.
    if (chessTerm.positions && chessTerm.positions.length > 0) {
      for (const pos of chessTerm.positions) {
        const annotations = pos.annotations ?? EMPTY_BOARD_ANNOTATIONS;
        await db
          .insert(glossaryTermPositions)
          .values({
            termId: term.id,
            fen: pos.fen,
            sortOrder: pos.sortOrder,
            caption: pos.caption || null,
            annotations,
          })
          .onConflictDoUpdate({
            target: [glossaryTermPositions.termId, glossaryTermPositions.fen],
            set: {
              sortOrder: pos.sortOrder,
              caption: pos.caption || null,
              // annotations omitted by design — see comment above.
            },
          });
        validPositions.push({ termId: term.id, fen: pos.fen });
      }
    }
  }

  // Clean up aliases/positions that were removed from the code data source.
  //
  // Upsert only handles additions and updates — it cannot detect deletions.
  // Since code is the source of truth for master data, any DB records that
  // no longer exist in the code must be deleted.
  await cleanupOrphanedAliases(validAliases);
  await cleanupOrphanedPositions(validPositions);
}

/**
 * Delete alias records from the DB that no longer exist in the code data source.
 */
async function cleanupOrphanedAliases(validAliases: { termId: string; alias: string }[]) {
  if (validAliases.length === 0) {
    // No aliases in code — delete all existing records
    await db.delete(glossaryTermAliases);
    return;
  }

  // Build a (term_id, alias) tuple list and delete orphaned records via NOT IN
  const tuples = validAliases.map((a) => sql`(${a.termId}, ${a.alias})`);
  await db
    .delete(glossaryTermAliases)
    .where(
      not(
        sql`(${glossaryTermAliases.termId}, ${glossaryTermAliases.alias}) IN (${sql.join(tuples, sql`, `)})`
      )
    );
}

/**
 * Delete position records from the DB that no longer exist in the code data source.
 */
async function cleanupOrphanedPositions(validPositions: { termId: string; fen: string }[]) {
  if (validPositions.length === 0) {
    await db.delete(glossaryTermPositions);
    return;
  }

  const tuples = validPositions.map((p) => sql`(${p.termId}, ${p.fen})`);
  await db
    .delete(glossaryTermPositions)
    .where(
      not(
        sql`(${glossaryTermPositions.termId}, ${glossaryTermPositions.fen}) IN (${sql.join(tuples, sql`, `)})`
      )
    );
}
