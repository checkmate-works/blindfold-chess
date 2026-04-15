'use client';

import { useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { Locale } from '@/app/[locale]/_lib/types';

import { TUTORIAL_SKIPPED_KEY } from '../_components/TutorialSkipLink';
import { presetOpenings } from '../_data/presetOpenings';
import { encodeMoveSequenceToBase64 } from '../_lib/share';
import { saveSettings } from '../_lib/storage';
import { useMoveSequenceSettings } from './use-move-sequence-settings';
import { useMoveSequenceValidation } from './use-move-sequence-validation';

type Params = {
  locale: Locale;
  urlFen: string | null;
  urlPgn: string | null;
  urlError: string | null;
};

/**
 * Owns the full MoveSequenceSetup form lifecycle: persisted fen/pgn/toggles
 * (via `useMoveSequenceSettings`), validation (via `useMoveSequenceValidation`),
 * preset selection, reset-confirmation and about-feature modal flags, input
 * change handlers, and the submit/navigation logic.
 *
 * The setup component consumes this hook and stays purely presentational.
 */
export function useMoveSequenceForm({ locale, urlFen, urlPgn, urlError }: Params) {
  const t = useTranslations('practice.moveSequence');
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    presetOpenings[0]?.id ?? null
  );
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isAboutFeatureOpen, setIsAboutFeatureOpen] = useState(false);

  const {
    fen,
    setFen,
    pgn,
    setPgn,
    includeOpponentMoves,
    setIncludeOpponentMoves,
    usePreset,
    setUsePreset,
    clearSettings: clearStoredSettings,
  } = useMoveSequenceSettings({ urlFen, urlPgn, urlError }, setError);

  const { validateInput, runValidation } = useMoveSequenceValidation(setError);

  const handleFenChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newFen = e.target.value;
      setFen(newFen);
      runValidation(newFen, pgn);
    },
    [setFen, runValidation, pgn]
  );

  const handlePgnChange = useCallback(
    (value: string) => {
      setPgn(value);
      runValidation(fen, value);
    },
    [setPgn, runValidation, fen]
  );

  const handleStart = useCallback(() => {
    setError(null);

    let startFen: string;
    let startPgn: string;

    if (usePreset) {
      const preset = presetOpenings.find((p) => p.id === selectedPresetId);
      if (!preset) {
        setError('Please select a preset');
        return;
      }
      startFen = preset.fen;
      startPgn = preset.pgn;
    } else {
      if (!fen.trim()) {
        setError(t('fenRequired'));
        return;
      }

      if (!pgn.trim()) {
        setError(t('pgnRequired'));
        return;
      }

      const validationError = validateInput(fen.trim(), pgn.trim());
      if (validationError) {
        setError(validationError);
        return;
      }

      startFen = fen.trim();
      startPgn = pgn.trim();

      saveSettings({ fen: startFen, pgn: startPgn, includeOpponentMoves });
    }

    const params = new URLSearchParams();
    const encoded = encodeMoveSequenceToBase64(startFen, startPgn);
    params.set('data', encoded);
    if (includeOpponentMoves) {
      params.set('includeOpponentMoves', '1');
    }

    router.push(
      `/${locale}/practice/move-sequence/session?${params.toString()}#move-sequence-session`
    );
  }, [
    usePreset,
    selectedPresetId,
    fen,
    pgn,
    includeOpponentMoves,
    validateInput,
    t,
    router,
    locale,
  ]);

  const handleResetConfirm = useCallback(() => {
    clearStoredSettings();
    localStorage.removeItem(TUTORIAL_SKIPPED_KEY);
    setIsResetConfirmOpen(false);
    router.push(`/${locale}/practice/move-sequence/tutorial`);
  }, [clearStoredSettings, router, locale]);

  return {
    // Form state
    fen,
    pgn,
    includeOpponentMoves,
    setIncludeOpponentMoves,
    usePreset,
    setUsePreset,
    selectedPresetId,
    setSelectedPresetId,
    error,
    // Modal flags
    isResetConfirmOpen,
    setIsResetConfirmOpen,
    isAboutFeatureOpen,
    setIsAboutFeatureOpen,
    // Handlers
    handleFenChange,
    handlePgnChange,
    handleStart,
    handleResetConfirm,
  };
}
