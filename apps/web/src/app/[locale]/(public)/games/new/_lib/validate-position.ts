// The chess-core validator now returns a discriminated union with a typed
// `correctedColor: Side`, so the wrapper that existed only to re-type that
// field is a plain re-export.
export type { PositionValidation as PositionValidationResult } from '@blindfold-chess/features/chess-core';
export { validatePosition } from '@blindfold-chess/features/chess-core';
