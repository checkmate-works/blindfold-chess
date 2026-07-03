import { useAsyncStorageSettings } from "../../../lib/persistent-settings/useAsyncStorageSettings";
import type { QuizSettings } from "../lib/types";
import { DEFAULT_QUIZ_SETTINGS } from "../lib/types";

const STORAGE_KEY = "COORDINATE_QUIZ_SETTINGS";

export const useQuizSettings = () =>
  useAsyncStorageSettings<QuizSettings>(STORAGE_KEY, DEFAULT_QUIZ_SETTINGS);
