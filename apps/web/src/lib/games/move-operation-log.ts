import type { MoveSquares } from '@/lib/board/move-squares';

import type { MoveOperationLog } from './saved-game-types';

/**
 * How a move reached the board, as recorded on {@link MoveOperationLog}.
 *
 * Broader than {@link MoveInputMode} (the three panel modes a player can
 * pick in preferences): a move can also arrive from the board itself or
 * from an autocomplete pick, and the audit log has to name those too.
 *
 * The `as const` array is the runtime source of truth for validating
 * untrusted records — localStorage games, the publish payload — and the
 * type derives from it so the two cannot drift. The vocabulary used to be
 * spelled out three times: a bare union here, a `string[]` in the undone-log
 * guard, and an array literal inside the stored-game validator. Adding a
 * method to the union alone left both validators rejecting every record
 * that used it, and a rejected record is discarded whole.
 */
export const MOVE_INPUT_METHODS = [
  'text',
  'text-autocomplete',
  'select',
  'button',
  'board',
] as const;

export type MoveInputMethod = (typeof MOVE_INPUT_METHODS)[number];

/** Shape guard for a `string[]` slot on an untrusted record. */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((s) => typeof s === 'string');
}

/** Shape guard for one {@link MoveOperationLog.invalidAttemptSquares} slot. */
function isAttemptSquaresSlot(value: unknown): value is MoveSquares | null {
  if (value === null) return true;
  if (typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return typeof s.from === 'string' && typeof s.to === 'string';
}

/**
 * Shape guard for one {@link MoveOperationLog} as read from an untrusted
 * place — a localStorage game, an archived undone entry, the publish
 * payload. Every optional counter is accepted as absent: records written
 * before a field existed must still load.
 *
 * Shared by the stored-game validator and the undone-log guard, which
 * checked the same eight fields independently.
 */
export function isMoveOperationLog(value: unknown): value is MoveOperationLog {
  if (typeof value !== 'object' || value === null) return false;
  const l = value as Record<string, unknown>;
  const methods: readonly string[] = MOVE_INPUT_METHODS;
  return (
    methods.includes(l.inputMethod as string) &&
    typeof l.peekCount === 'number' &&
    typeof l.undoCount === 'number' &&
    (l.movePeekCount === undefined || typeof l.movePeekCount === 'number') &&
    (l.invalidCount === undefined || typeof l.invalidCount === 'number') &&
    (l.invalidAttempts === undefined || isStringArray(l.invalidAttempts)) &&
    (l.invalidAttemptSquares === undefined ||
      (Array.isArray(l.invalidAttemptSquares) &&
        l.invalidAttemptSquares.every(isAttemptSquaresSlot)))
  );
}
