import { useEffect, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { useLocalStorageSettings } from '@/lib/persistent-settings/use-local-storage-settings';

import type { MoveSequenceSettings } from '../_lib/types';

const STORAGE_KEY = 'moveSequenceSettings';

const DEFAULT_SETTINGS: MoveSequenceSettings = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn: '',
  includeOpponentMoves: false,
};

type UrlParams = {
  urlFen: string | null;
  urlPgn: string | null;
  urlError: string | null;
};

export function useMoveSequenceSettings(
  { urlFen, urlPgn, urlError }: UrlParams,
  setError: (error: string | null) => void
) {
  const t = useTranslations('practice.moveSequence');
  const hasUrlOverride = urlFen !== null && urlPgn !== null;

  const {
    settings: persistedSettings,
    updateSettings: updatePersistedSettings,
    isLoaded: isPersistedLoaded,
  } = useLocalStorageSettings<MoveSequenceSettings>(STORAGE_KEY, DEFAULT_SETTINGS);

  // URL-derived state (used when URL params are present)
  const [urlSettings, setUrlSettings] = useState<MoveSequenceSettings>(() =>
    hasUrlOverride
      ? { fen: urlFen, pgn: urlPgn, includeOpponentMoves: DEFAULT_SETTINGS.includeOpponentMoves }
      : DEFAULT_SETTINGS
  );

  const [usePreset, setUsePreset] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Initialize preset state based on loaded settings or URL params
  useEffect(() => {
    if (hasUrlOverride) {
      setUsePreset(false);
      setHasLoaded(true);
      return;
    }

    if (isPersistedLoaded) {
      if (persistedSettings.pgn.trim()) {
        setUsePreset(false);
      }
      setHasLoaded(true);
    }
  }, [hasUrlOverride, isPersistedLoaded, persistedSettings.pgn]);

  // Show URL error if present
  useEffect(() => {
    if (urlError) {
      setError(t(urlError as 'url_too_long' | 'invalid_data' | 'invalid_fen'));
    }
  }, [urlError, t, setError]);

  const settings = hasUrlOverride ? urlSettings : persistedSettings;
  const updateSettings = hasUrlOverride
    ? (partial: Partial<MoveSequenceSettings>) =>
        setUrlSettings((prev) => ({ ...prev, ...partial }))
    : updatePersistedSettings;

  const clearSettings = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    fen: settings.fen,
    setFen: (v: string) => updateSettings({ fen: v }),
    pgn: settings.pgn,
    setPgn: (v: string) => updateSettings({ pgn: v }),
    includeOpponentMoves: settings.includeOpponentMoves,
    setIncludeOpponentMoves: (v: boolean) => updateSettings({ includeOpponentMoves: v }),
    usePreset,
    setUsePreset,
    hasLoaded,
    clearSettings,
  };
}
