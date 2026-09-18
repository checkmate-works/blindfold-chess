import type { Square } from '@blindfold-chess/types';

/**
 * The pair of squares a move went between — what a board needs in order to
 * highlight the last move, and what an illegal-move handler is told about the
 * attempt.
 *
 * Twenty-eight modules used to inline this shape, several under a local alias
 * (`LastMove`, `MoveSquares`, `ProblemResult['reply']`), so a board prop, the
 * hook feeding it and the persistence record describing it were three
 * unrelated types that happened to match.
 *
 * `Square` costs the producers nothing: nearly every value here comes from
 * `getLastMoveDetails` or a `MoveResult`, which are typed that way already.
 * The exception is the interactive board, whose squares arrive as
 * `dataset.square` strings — the DOM has no narrower type to offer. It runs
 * every one of those reads through `isValidSquare` at the read itself — the
 * click target, the drag source, and the square under a drop — so nothing
 * downstream of them needs a cast.
 */
export type MoveSquares = { from: Square; to: Square };
