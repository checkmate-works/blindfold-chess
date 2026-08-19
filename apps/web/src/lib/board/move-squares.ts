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
 * `string` rather than `Square` is a known gap, and now a small one. Most of
 * these values originate from `getLastMoveDetails` or a `MoveResult`, both of
 * which are already typed `Square`; flipping this declaration leaves exactly
 * one thing unassignable — the squares ChessBoard reads out of
 * `dataset.square` and threads through `BoardClickAction`, which are `string`
 * because the DOM has no narrower type to offer. Narrowing therefore needs a
 * parse at that one boundary, not a sweep.
 *
 * Tracking: GitHub issue #156
 */
export type MoveSquares = { from: string; to: string };
