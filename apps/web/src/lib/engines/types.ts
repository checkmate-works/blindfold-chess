/**
 * The engine list, its union, default and guard live in
 * `@blindfold-chess/features/ai-game` so the mobile app's saved games carry
 * the same engine vocabulary; re-exported here so web imports (including the
 * DB column's `$type`) stay put.
 */
export {
  DEFAULT_ENGINE,
  ENGINE_KINDS,
  type EngineKind,
  isEngineKind,
} from '@blindfold-chess/features/ai-game';
