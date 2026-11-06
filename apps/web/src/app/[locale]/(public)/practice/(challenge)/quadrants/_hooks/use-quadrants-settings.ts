'use client';

import {
  DEFAULT_QUADRANTS_SETTINGS,
  type QuadrantsSettings,
} from '@blindfold-chess/features/quadrants';

import { useLocalStorageSettings } from '@/lib/persistent-settings/use-local-storage-settings';

export type { QuadrantsSettings };

/**
 * Named for the challenge because that screen was the only one reading it
 * while training was hardcoded to a white board. The key itself stays as it
 * is so the orientation players already chose survives the change.
 */
const STORAGE_KEY = 'quadrantAnchors_challenge_settings';

/**
 * The board orientation the player answers from, for both modes.
 *
 * The challenge setup owns the selector and writes here; the module top reads
 * it to point the training link at the same orientation, because the training
 * screen takes it from the URL and a bare link means a white board.
 */
export function useQuadrantsSettings() {
  return useLocalStorageSettings(STORAGE_KEY, DEFAULT_QUADRANTS_SETTINGS);
}
