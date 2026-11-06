import { DEFAULT_KNIGHT_TOUR_SETTINGS } from "@blindfold-chess/features/knight-tour";
import type { KnightTourSettings } from "@blindfold-chess/features/knight-tour";

import { useAsyncStorageSettings } from "../../../lib/persistent-settings/useAsyncStorageSettings";

const STORAGE_KEY = "KNIGHT_TOUR_SETTINGS";

export const useKnightTourSettings = () =>
  useAsyncStorageSettings<KnightTourSettings>(
    STORAGE_KEY,
    DEFAULT_KNIGHT_TOUR_SETTINGS,
  );
