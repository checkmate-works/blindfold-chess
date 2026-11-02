export type { Square } from '@blindfold-chess/types';

// The shared predicate already narrows to `Square`; re-exported so existing
// importers of this module keep working.
export { isValidSquare } from '@blindfold-chess/features/common';
