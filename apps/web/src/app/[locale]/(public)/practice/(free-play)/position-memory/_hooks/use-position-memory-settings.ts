'use client';

import { useLocalStorageSettings } from '@/lib/persistent-settings/use-local-storage-settings';

import { DEFAULT_DISPLAY_MODE, DEFAULT_TIME_LIMIT, type DisplayMode } from '../_lib/session-config';

export type PositionMemorySettings = {
  timeLimit: number;
  displayMode: DisplayMode;
};

const STORAGE_KEY = 'positionMemory_settings';

const DEFAULTS: PositionMemorySettings = {
  timeLimit: DEFAULT_TIME_LIMIT,
  displayMode: DEFAULT_DISPLAY_MODE,
};

/**
 * How long the position is shown and how it is presented, remembered across
 * visits and shared by every position the player studies.
 *
 * These are a preference about how someone studies, not a property of the
 * position in front of them, so a player who memorises from the piece list in
 * fifteen seconds should not have to say so again on the next position — or
 * on the same one after a session ends and drops them back on this form.
 */
export function usePositionMemorySettings() {
  return useLocalStorageSettings(STORAGE_KEY, DEFAULTS);
}
