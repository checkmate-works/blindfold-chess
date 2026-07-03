import { useAsyncStorageSettings } from "../../../lib/persistent-settings/useAsyncStorageSettings";
import type { BoardSymmetrySettings } from "../lib/types";
import { DEFAULT_BOARD_SYMMETRY_SETTINGS } from "../lib/types";

const STORAGE_KEY = "BOARD_SYMMETRY_SETTINGS";

export const useBoardSymmetrySettings = () =>
  useAsyncStorageSettings<BoardSymmetrySettings>(
    STORAGE_KEY,
    DEFAULT_BOARD_SYMMETRY_SETTINGS,
  );
