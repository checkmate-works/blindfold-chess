import {
  DEFAULT_FEN_SETTINGS,
  POSITION_MEMORY_FENS,
  type FenSettings,
} from "@blindfold-chess/features/fen-practice";

import { useAsyncStorageSettings } from "../../lib/persistent-settings/useAsyncStorageSettings";

/**
 * Memorising seconds offered on the setup screen. The web takes any value in
 * 5–60 on a slider; these are its marked stops.
 */
export const MEMORIZE_TIME_OPTIONS = [5, 10, 30, 60] as const;

/**
 * The FEN drill's settings (problem source, count, shuffle) plus how long
 * each position stays on screen before it has to be recreated.
 */
export type PositionMemorySettings = FenSettings & {
  memorizeSeconds: number;
};

export const DEFAULT_POSITION_MEMORY_SETTINGS: PositionMemorySettings = {
  ...DEFAULT_FEN_SETTINGS,
  problemCount: POSITION_MEMORY_FENS.length,
  memorizeSeconds: 30,
};

const STORAGE_KEY = "POSITION_MEMORY_SETTINGS";

export const usePositionMemorySettings = () =>
  useAsyncStorageSettings<PositionMemorySettings>(
    STORAGE_KEY,
    DEFAULT_POSITION_MEMORY_SETTINGS,
  );
