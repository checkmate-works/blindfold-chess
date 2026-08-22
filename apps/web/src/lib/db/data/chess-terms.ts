import type { ChessTerm } from '@/app/[locale]/(public)/glossary/_lib/types';

import { termsAC } from './terms/a-c';
import { termsDL } from './terms/d-l';
import { termsMP } from './terms/m-p';
import { termsPrinciples } from './terms/principles';
import { termsRZ } from './terms/r-z';

/**
 * Chess terms glossary seed data.
 *
 * Entries are split across `./terms/*.ts` files by alphabetical range for
 * maintainability. The concatenated array is sorted by term at module load
 * time (same as before the split), so in-source ordering of the sub-files
 * does not affect the public API.
 */
export const chessTerms: readonly ChessTerm[] = [
  ...termsAC,
  ...termsDL,
  ...termsMP,
  ...termsRZ,
  ...termsPrinciples,
].sort((a, b) => a.term.localeCompare(b.term));
