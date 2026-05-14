'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { DEFAULT_MAIA_RATING, type MaiaRating } from '@blindfold-chess/features/ai-game/maia';
import { getPgnHeaders, getPgnHistory } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import { DEFAULT_ENGINE, type EngineKind } from '@/lib/engines';
import { shouldWarnBeforeLargeDownload } from '@/lib/network/connection';
import type { SkillLevel } from '@/lib/types';

import { LargeDownloadConsentDialog } from '@/app/[locale]/(public)/games/new/_components/LargeDownloadConsentDialog';
import { useLocalGameSettings } from '@/app/[locale]/(public)/games/new/_hooks/use-local-game-settings';
import { parsePgnWithFen, validatePgn } from '@/app/[locale]/(public)/games/play/_lib/pgn-parser';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PgnPreview } from './PgnPreview';
import { PgnSetupForm } from './PgnSetupForm';
import { deriveInitialPgnState } from './_lib/derive-initial-pgn-state';

const MAIA_MODEL_SIZE_LABEL = '46 MB';

type Props = {
  locale: Locale;
  maiaUnlocked: boolean;
};

export function PgnGameForm({ locale, maiaUnlocked }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { localSettings, handleSettingsChange } = useLocalGameSettings();

  // Derive all URL-sourced initial values synchronously via useState's lazy
  // initializer — this replaces the previous URL→state useEffect. We
  // snapshot the searchParams instance into a URLSearchParams because
  // `useSearchParams` returns a stable ReadonlyURLSearchParams that is
  // effectively immutable for the lifetime of the navigation.
  const initial = useMemo(
    () => deriveInitialPgnState(new URLSearchParams(searchParams.toString())),
    // URL is the source of truth on first render only, matching the
    // previous single-shot useEffect semantics.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [color, setColor] = useState<Side>(initial.color ?? 'white');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(initial.skillLevel ?? 5);
  const [maiaRating, setMaiaRating] = useState<MaiaRating>(
    initial.maiaRating ?? DEFAULT_MAIA_RATING
  );
  const [engine, setEngine] = useState<EngineKind>(initial.engine ?? DEFAULT_ENGINE);
  const [pgn, setPgn] = useState(initial.pgn);
  const [isLoading, setIsLoading] = useState(false);
  const [colorManuallySet, setColorManuallySet] = useState(initial.color !== null);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);

  // Parse PGN to get moves array and starting FEN
  const { pgnMoves, startingFen } = useMemo((): {
    pgnMoves: AlgebraicNotation[];
    startingFen?: string;
  } => {
    if (!pgn.trim() || !validatePgn(pgn)) return { pgnMoves: [] };
    try {
      const result = parsePgnWithFen(pgn);
      return {
        pgnMoves: result.moves as AlgebraicNotation[],
        startingFen: result.startingFen,
      };
    } catch {
      return { pgnMoves: [] };
    }
  }, [pgn]);

  // Auto-derive color from PGN
  // Skip auto-derivation if color was manually set by user or from URL
  useEffect(() => {
    if (colorManuallySet) return;

    if (pgn.trim() && validatePgn(pgn)) {
      try {
        const history = getPgnHistory(pgn, { verbose: true }) as { color: string }[];

        if (history.length > 0) {
          const lastMoveEntry = history[history.length - 1];
          const derivedColor: Side = lastMoveEntry.color === 'w' ? 'black' : 'white';
          setColor(derivedColor);
        } else {
          const headers = getPgnHeaders(pgn);
          if (headers.FEN) {
            const fenParts = headers.FEN.split(' ');
            if (fenParts.length >= 2) {
              const turnFromFen = fenParts[1];
              const derivedColor: Side = turnFromFen === 'w' ? 'white' : 'black';
              setColor(derivedColor);
            }
          }
        }
      } catch {
        // If PGN parsing fails, keep current color selection
      }
    }
  }, [pgn, colorManuallySet]);

  const handlePgnChange = useCallback((value: string) => {
    setPgn(value);
  }, []);

  const handleColorChange = useCallback((newColor: Side) => {
    setColor(newColor);
    setColorManuallySet(true);
  }, []);

  const navigateToGame = () => {
    const parsed = parsePgnWithFen(pgn);
    const moves = parsed.moves;
    const fenToPass = parsed.startingFen;

    const params = new URLSearchParams({
      color,
      gamePrefs: JSON.stringify(localSettings),
    });
    if (engine === 'maia') {
      params.set('engine', 'maia');
      params.set('elo', maiaRating.toString());
    } else {
      params.set('skillLevel', skillLevel.toString());
    }

    if (moves && moves.length > 0) {
      params.set('moves', JSON.stringify(moves));
    }
    if (fenToPass) {
      params.set('fen', fenToPass);
    }

    router.push(`/${locale}/games/play?${params.toString()}`);
  };

  const handleStartGame = () => {
    setIsLoading(true);

    if (!pgn.trim() || !validatePgn(pgn)) {
      setIsLoading(false);
      return;
    }

    if (engine === 'maia' && shouldWarnBeforeLargeDownload()) {
      setConsentDialogOpen(true);
      return;
    }
    navigateToGame();
  };

  const handleConsentConfirm = () => {
    setConsentDialogOpen(false);
    navigateToGame();
  };

  const handleConsentCancel = () => {
    setConsentDialogOpen(false);
    setIsLoading(false);
  };

  const isStartDisabled = !pgn.trim() || !validatePgn(pgn);
  const showDerivedFromPgnHint = pgn.trim() !== '' && validatePgn(pgn) && !colorManuallySet;

  return (
    <>
      <PgnSetupForm
        pgn={pgn}
        onPgnChange={handlePgnChange}
        color={color}
        onColorChange={handleColorChange}
        skillLevel={skillLevel}
        onSkillLevelChange={setSkillLevel}
        maiaRating={maiaRating}
        onMaiaRatingChange={setMaiaRating}
        engine={engine}
        onEngineChange={setEngine}
        maiaUnlocked={maiaUnlocked}
        localSettings={localSettings}
        onSettingsChange={handleSettingsChange}
        showDerivedFromPgnHint={showDerivedFromPgnHint}
        isStartDisabled={isStartDisabled}
        isLoading={isLoading}
        onStartGame={handleStartGame}
        previewSlot={<PgnPreview pgnMoves={pgnMoves} startingFen={startingFen} color={color} />}
      />
      <LargeDownloadConsentDialog
        isOpen={consentDialogOpen}
        onConfirm={handleConsentConfirm}
        onCancel={handleConsentCancel}
        sizeLabel={MAIA_MODEL_SIZE_LABEL}
      />
    </>
  );
}
