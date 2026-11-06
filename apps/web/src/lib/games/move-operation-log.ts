/**
 * The move-input-method vocabulary of the operation log and the guards for an
 * untrusted log entry live in `@blindfold-chess/features/game-record`, where
 * they are documented, so the mobile app validates saved games by the same
 * rules; re-exported here so web imports stay put.
 */
export {
  MOVE_INPUT_METHODS,
  type MoveInputMethod,
  isMoveOperationLog,
  isStringArray,
} from '@blindfold-chess/features/game-record';
