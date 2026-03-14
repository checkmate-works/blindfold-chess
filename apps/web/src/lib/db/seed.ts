/**
 * Database seed script
 *
 * Seeding strategy:
 * - Master data (glossary) → onConflictDoUpdate (upsert)
 *   Overwritten with the latest code data on every deploy. Code is the source of truth.
 * - Initial data (ad_banners, site_settings) → onConflictDoNothing
 *   Inserted only on first run; DB is the source of truth afterward.
 *   Values modified via admin UI are never overwritten.
 *
 * This distinction mirrors the seed() (always update) vs seed_once() (first-time only)
 * pattern from Rails' seed-fu gem. In the Drizzle / Prisma / RedwoodJS community,
 * using the ORM's built-in upsert capabilities directly is the mainstream approach
 * for master data seeding.
 */
import { not, sql } from 'drizzle-orm';

import { chessTerms } from './data/chess-terms';
import {
  adBanners,
  articleCategories,
  articleCategoryTranslations,
  db,
  glossaryTermAliases,
  glossaryTermPositions,
  glossaryTermTranslations,
  glossaryTerms,
  siteSettings,
} from './index';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// ---------------------------------------------------------------------------
// Master data: Glossary (code is source of truth, upserted on every deploy)
// ---------------------------------------------------------------------------

async function seedGlossaryTerms() {
  console.log(`Seeding ${chessTerms.length} glossary terms...`);

  // Collect valid pairs for orphaned-record cleanup after upsert
  const validAliases: { termId: string; alias: string }[] = [];
  const validPositions: { termId: string; fen: string }[] = [];

  for (const chessTerm of chessTerms) {
    const slug = slugify(chessTerm.term);
    const category = chessTerm.category || 'general';

    // Upsert term (idempotent on slug)
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

    // Upsert positions (idempotent on term_id + fen unique constraint)
    if (chessTerm.positions && chessTerm.positions.length > 0) {
      for (const pos of chessTerm.positions) {
        await db
          .insert(glossaryTermPositions)
          .values({
            termId: term.id,
            fen: pos.fen,
            sortOrder: pos.sortOrder,
            caption: pos.caption || null,
          })
          .onConflictDoUpdate({
            target: [glossaryTermPositions.termId, glossaryTermPositions.fen],
            set: {
              sortOrder: pos.sortOrder,
              caption: pos.caption || null,
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

async function seedArticleCategories() {
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

// ---------------------------------------------------------------------------
// Initial data: Ads & site settings (DB is source of truth, insert once only)
// ---------------------------------------------------------------------------

async function seedAds() {
  console.log('Seeding ads configuration...');

  // Site setting: ads_enabled
  await db
    .insert(siteSettings)
    .values({ key: 'ads_enabled', value: { enabled: false } })
    .onConflictDoNothing({ target: siteSettings.key });

  // Ad banners
  const bannerData = [
    {
      slot: 'home-wide',
      href: 'https://example.com',
      imagePath: '/images/banners/banner1.webp',
      alt: 'Advertisement',
      width: 960,
      height: 208,
    },
    {
      slot: 'topics-squares-square',
      href: 'https://example.com',
      imagePath: '/images/banners/banner2.webp',
      alt: 'Advertisement',
      width: 400,
      height: 400,
    },
  ] as const;

  for (const banner of bannerData) {
    await db.insert(adBanners).values(banner).onConflictDoNothing({ target: adBanners.slot });
  }
}

async function seed() {
  console.log('Seeding database...');

  await seedGlossaryTerms();
  await seedArticleCategories();
  await seedAds();

  console.log('Seeding complete.');
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
