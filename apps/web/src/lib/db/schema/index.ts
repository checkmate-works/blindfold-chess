/**
 * Schema entry point.
 *
 * Every domain module under `./` is re-exported here so consumers keep the
 * stable surface they were using before the per-domain split:
 *
 *   import { articles, profiles } from '@/lib/db/schema';
 *
 * When adding a new table:
 *  1. Add it to the right per-domain file (or create a new one if no
 *     existing domain fits).
 *  2. Add a corresponding `export * from './<domain>';` line below.
 *
 * Cross-domain references (e.g. `positionTags` referencing `tags` from
 * articles) are real `import` statements between the domain files. Order
 * within this barrel doesn't matter — ES modules resolve the reference
 * graph regardless.
 */

export * from './articles';
export * from './glossary';
export * from './auth';
export * from './posts';
export * from './social';
export * from './moderation';
export * from './notifications';
export * from './rankings';
export * from './billing';
export * from './interview';
export * from './ranks';
export * from './achievements';
export * from './gamification';
export * from './positions';
export * from './puzzles';
export * from './games';
export * from './repertoires';
