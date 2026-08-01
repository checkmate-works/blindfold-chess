import type { RepertoireLineEditError } from './validation';

/**
 * Every error a line-writing mutation (`updateRepertoireLine` /
 * `addRepertoireLine`) can return that the forms have i18n copy for; anything
 * outside this set falls back to the generic message. Shared by the line-edit
 * form and the kata check's add-line form so the list can't drift from the
 * mutations' error union — the `satisfies` clause fails to compile if a key
 * is misspelled or the union gains a member spelled differently.
 *
 * Deliberately a leaf module (the type import erases at compile time): the
 * consumers are client components, and importing `validation.ts` for its
 * values would pull chess.js into their bundles.
 */
export const KNOWN_LINE_FORM_ERRORS: ReadonlySet<string> = new Set([
  'unauthorized',
  'notFound',
  'invalidChapter',
  'nameTooLong',
  'pgnRequired',
  'pgnTooLarge',
  'invalidPgn',
  'noMoves',
] as const satisfies readonly (
  'unauthorized' | 'notFound' | 'invalidChapter' | RepertoireLineEditError
)[]);
