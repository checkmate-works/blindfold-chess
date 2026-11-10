/**
 * Saved-game domain types — including the game-operation audit model.
 *
 * ## The three-record model (game operation logging, issue #95)
 *
 * A play session keeps THREE related records of the player's aid usage
 * (peeks, undos, invalid move attempts). They answer different questions and
 * follow different mutation rules — never conflate them:
 *
 * 1. {@link MoveOperationLog}[] (`operationLogs`) — the DISPLAY record.
 *    One entry per committed player move. Follows "undo = the move never
 *    happened": a rollback deletes the entry. Drives the per-move UI and the
 *    denormalized `clean_rate`.
 * 2. {@link OperationTotals} (`operationTotals`) — the COUNT ledger.
 *    Monotonic game-lifetime counters, bumped at the instant each operation
 *    happens; nothing ever decrements them. Invariant: each counter equals
 *    the exact number of corresponding record calls over the game's life, so
 *    peek → undo → replay cannot launder aid usage. This is the audit and
 *    promotion source of truth (the 1dan hidden-board evaluator reads
 *    `peeks`).
 * 3. {@link UndoneMoveLog}[] (`undoneLogs`) — the DETAIL archive. Whatever a
 *    rollback (Undo / restart-from-position) removes from `operationLogs` —
 *    notably rejected SAN texts, which counts cannot reconstruct — is
 *    archived here at the moment of removal, capped per game.
 *
 * Together: a rollback moves information (counts stay in 2, detail moves to
 * 3) — it never destroys it.
 *
 * ## Pipeline
 *
 * `useMoveOperationTracker` (records all three) → `useAutoSave` →
 * localStorage {@link Game} → publish payload → `validatePublishSnapshot`
 * (`@/lib/games/publish-game`, server-side re-bounding) →
 * `games.operation_logs` / `operation_totals` / `undone_logs` (JSONB) →
 * `game_publish_win_hidden_board` evaluator (`@/lib/db/rank-evaluation`,
 * policy TSDoc in `@/lib/db/data/ranks`).
 *
 * ## Restore is a merge, not an overwrite
 *
 * A brand-new game saves on mount, the URL then gains its gameId, and the
 * restore effect re-applies that stale snapshot over live state. Every
 * restore path therefore merges: totals per-counter max, undoneLogs
 * longer-list, and log restoration leaves in-flight counters untouched.
 *
 * The executable specification of these laws is
 * `games/play/_hooks/use-move-operation-tracker.invariants.test.ts` —
 * change the semantics there consciously, not incidentally.
 */

/*
 * The types themselves live in `@blindfold-chess/features/game-record` so the
 * mobile app can save and read games in the same shape; this module
 * re-exports them so web imports stay put, and keeps the description above of
 * how the web play surface records, saves and publishes them.
 */
export type {
  Game,
  GamePlaySettings,
  GameSortOption,
  MoveInputMethod,
  MoveOperationLog,
  OperationTotals,
  PlaySettingsChangeEntry,
  PreferenceChangeLogEntry,
  SortDirection,
  StoredGame,
  UndoneMoveLog,
} from '@blindfold-chess/features/game-record';

export type { SkillLevel } from '@blindfold-chess/features/ai-game';
export type { GameOutcome } from '@blindfold-chess/types';
