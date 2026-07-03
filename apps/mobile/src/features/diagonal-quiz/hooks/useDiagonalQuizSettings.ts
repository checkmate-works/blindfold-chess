import { useAsyncStorageSettings } from "../../../lib/persistent-settings/useAsyncStorageSettings";
import type { DiagonalQuizSettings } from "../lib/types";
import { DEFAULT_DIAGONAL_QUIZ_SETTINGS } from "../lib/types";

const STORAGE_KEY = "DIAGONAL_QUIZ_SETTINGS";

export const useDiagonalQuizSettings = () =>
  useAsyncStorageSettings<DiagonalQuizSettings>(
    STORAGE_KEY,
    DEFAULT_DIAGONAL_QUIZ_SETTINGS,
  );
