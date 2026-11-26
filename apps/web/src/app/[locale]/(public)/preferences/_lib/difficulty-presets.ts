// The ladder itself is shared with the mobile app; this module keeps the
// import path the web's settings components already use.
export type {
  DifficultyLevel,
  DifficultyPresetSettings,
} from '@blindfold-chess/features/game-preferences';
export {
  DIFFICULTY_LEVELS,
  DIFFICULTY_PRESETS,
  matchDifficultyPreset,
} from '@blindfold-chess/features/game-preferences';
