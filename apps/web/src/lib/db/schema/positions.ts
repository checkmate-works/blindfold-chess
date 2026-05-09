/**
 * Public surface for the puzzle-solution shape used by the practice puzzle
 * components. The other position-related tables are consumed only via the
 * root @/lib/db barrel (`./tables`); only PuzzleSolutionMove is imported
 * through this dedicated module path today.
 */
export type { PuzzleSolutionMove } from './tables';
