import type { MoveSequenceSettings } from './types';

const STORAGE_KEY = 'moveSequenceSettings';

export function saveSettings(settings: MoveSequenceSettings): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}
