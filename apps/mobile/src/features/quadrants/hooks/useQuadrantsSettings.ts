import {
  DEFAULT_QUADRANTS_SETTINGS,
  type QuadrantsSettings,
} from "@blindfold-chess/features/quadrants";

import { useAsyncStorageSettings } from "../../../lib/persistent-settings/useAsyncStorageSettings";

const STORAGE_KEY = "QUADRANTS_SETTINGS";

export const useQuadrantsSettings = () =>
  useAsyncStorageSettings<QuadrantsSettings>(
    STORAGE_KEY,
    DEFAULT_QUADRANTS_SETTINGS,
  );
