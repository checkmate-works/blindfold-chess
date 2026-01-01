import type { MoveSequenceSettings } from './types';

const STORAGE_KEY = 'moveSequenceSettings';

const defaultSettings: MoveSequenceSettings = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn: '',
};

export function loadSettings(): MoveSequenceSettings {
  if (typeof window === 'undefined') {
    return defaultSettings;
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        fen: parsed.fen ?? defaultSettings.fen,
        pgn: parsed.pgn ?? defaultSettings.pgn,
      };
    }
  } catch {
    // Ignore parse errors
  }

  return defaultSettings;
}

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

export function getDefaultSettings(): MoveSequenceSettings {
  return { ...defaultSettings };
}
