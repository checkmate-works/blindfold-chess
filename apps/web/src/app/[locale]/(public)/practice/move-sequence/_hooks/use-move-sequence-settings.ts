import { useEffect, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { clearSettings, loadSettings, saveSettings } from '../_lib/storage';

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

  const [fen, setFen] = useState('');
  const [pgn, setPgn] = useState('');
  const [includeOpponentMoves, setIncludeOpponentMoves] = useState(false);
  const [usePreset, setUsePreset] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load settings from localStorage on mount (URL params handled separately in page.tsx)
  useEffect(() => {
    if (urlFen !== null && urlPgn !== null) {
      setFen(urlFen);
      setPgn(urlPgn);
      setUsePreset(false);
      setHasLoaded(true);
      return;
    }

    const settings = loadSettings();
    setFen(settings.fen);
    setPgn(settings.pgn);
    setIncludeOpponentMoves(settings.includeOpponentMoves);
    if (settings.pgn.trim()) {
      setUsePreset(false);
    }
    setHasLoaded(true);
  }, [urlFen, urlPgn]);

  // Show URL error if present
  useEffect(() => {
    if (urlError) {
      setError(t(urlError as 'url_too_long' | 'invalid_data' | 'invalid_fen'));
    }
  }, [urlError, t, setError]);

  // Save settings when they change
  useEffect(() => {
    if (!hasLoaded) return;
    saveSettings({ fen, pgn, includeOpponentMoves });
  }, [fen, pgn, includeOpponentMoves, hasLoaded]);

  return {
    fen,
    setFen,
    pgn,
    setPgn,
    includeOpponentMoves,
    setIncludeOpponentMoves,
    usePreset,
    setUsePreset,
    hasLoaded,
    clearSettings,
  };
}
