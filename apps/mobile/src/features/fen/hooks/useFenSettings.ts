import {
  DEFAULT_FEN_SETTINGS,
  type FenSettings,
} from "@blindfold-chess/features/fen-practice";

import { useAsyncStorageSettings } from "../../../lib/persistent-settings/useAsyncStorageSettings";

const STORAGE_KEY = "FEN_PRACTICE_SETTINGS";

/** The FEN drill's setup, kept on the device; shape and defaults are shared with the web. */
export const useFenSettings = () =>
  useAsyncStorageSettings<FenSettings>(STORAGE_KEY, DEFAULT_FEN_SETTINGS);
