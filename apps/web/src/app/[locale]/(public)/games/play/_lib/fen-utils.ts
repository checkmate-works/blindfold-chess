/**
 * The starting-FEN move helpers (which side made a move, from which move
 * number the list counts) moved to `@blindfold-chess/features/game-play` so the
 * mobile app numbers moves the same way. Re-exported here for the importers
 * outside the games area (practice, topics, the PGN replay hook); new code
 * imports the package.
 */
export { countPlayerMoves, getMovingSide, parseFenMeta } from '@blindfold-chess/features/game-play';
