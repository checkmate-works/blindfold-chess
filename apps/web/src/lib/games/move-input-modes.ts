/**
 * How a player enters a move: typed algebraic notation, a pair of square
 * dropdowns, or on-screen piece/square buttons. The value list and the type
 * live in `@blindfold-chess/features/game-preferences` so the mobile app
 * validates stored preferences against the same set; this module re-exports
 * them so web imports stay put.
 */
export { MOVE_INPUT_MODES, type MoveInputMode } from '@blindfold-chess/features/game-preferences';
