import { useAsyncStorageSettings } from "../../../lib/persistent-settings/useAsyncStorageSettings";
import type { SquareColorsSettings } from "../lib/types";
import { DEFAULT_SQUARE_COLORS_SETTINGS } from "../lib/types";

const STORAGE_KEY = "SQUARE_COLORS_SETTINGS";

export const useSquareColorsSettings = () =>
  useAsyncStorageSettings<SquareColorsSettings>(
    STORAGE_KEY,
    DEFAULT_SQUARE_COLORS_SETTINGS,
  );
