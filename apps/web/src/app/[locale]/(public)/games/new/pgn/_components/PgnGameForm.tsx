'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { DEFAULT_MAIA_RATING, type MaiaRating } from '@blindfold-chess/features/ai-game/maia';
import { getPgnHeaders, getPgnHistory } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import {
  DEFAULT_ENGINE,
  type EngineConfig,
  type EngineKind,
  engineConfigToUrlParams,
} from '@/lib/engines';
import { MAIA_CHARGE_PARAM } from '@/lib/games/maia-charge-param';
import type { SkillLevel } from '@/lib/games/saved-game-types';
import { MAIA_GAME_POINT_COST } from '@/lib/points/constants';
import type { MaiaEngineAccess } from '@/lib/users/can-use-maia';

import { GameLaunchModals } from '@/app/[locale]/(public)/games/new/_components/GameLaunchModals';
import { useLocalGameSettings } from '@/app/[locale]/(public)/games/new/_hooks/use-local-game-settings';
import { useMaiaGameLaunch } from '@/app/[locale]/(public)/games/new/_hooks/use-maia-game-launch';
import { deriveMaiaCardMode } from '@/app/[locale]/(public)/games/new/_lib/maia-launch';
import { parsePgnWithFen, validatePgn } from '@/app/[locale]/(public)/games/play/_lib/pgn-parser';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PgnPreview } from './PgnPreview';
import { PgnSetupForm } from './PgnSetupForm';
import { deriveInitialPgnState } from './_lib/derive-initial-pgn-state';

type Props = {
  locale: Locale;
  maiaAccess: MaiaEngineAccess;
};

export function PgnGameForm({ locale, maiaAccess }: Props) {
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
  const [colorManuallySet, setColorManuallySet] = useState(initial.color !== null);

  // Parse PGN to get moves array and starting FEN
  const { pgnMoves, startingFen } = useMemo((): {
    pgnMoves: AlgebraicNotation[];
    startingFen?: string;
  } => {
    if (!pgn.trim() || !validatePgn(pgn)) return { pgnMoves: [] };
    const result = parsePgnWithFen(pgn);
    if (!result.ok) return { pgnMoves: [] };
    return { pgnMoves: result.value.moves, startingFen: result.value.startingFen };
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

  const engineConfig: EngineConfig =
    engine === 'maia' ? { kind: 'maia', rating: maiaRating } : { kind: 'stockfish', skillLevel };

  const navigateToGame = (maiaChargeId: string | null) => {
    const parsed = parsePgnWithFen(pgn);
    if (!parsed.ok) {
      // The Start button is gated on validatePgn; reaching here means the two
      // parsers disagree, and navigating would start a moveless game.
      console.error('[pgn-game] PGN accepted by validatePgn failed to parse', parsed.error);
      return;
    }
    const moves = parsed.value.moves;
    const fenToPass = parsed.value.startingFen;

    const params = new URLSearchParams({
      color,
      gamePrefs: JSON.stringify(localSettings),
      ...engineConfigToUrlParams(engineConfig),
    });

    if (moves && moves.length > 0) {
      params.set('moves', JSON.stringify(moves));
    }
    if (fenToPass) {
      params.set('fen', fenToPass);
    }
    if (maiaChargeId) params.set(MAIA_CHARGE_PARAM, maiaChargeId);

    router.push(`/${locale}/games/play?${params.toString()}`);
  };

  const launch = useMaiaGameLaunch({ navigateToGame });

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
        maiaCardMode={deriveMaiaCardMode(maiaAccess, MAIA_GAME_POINT_COST)}
        maiaCost={MAIA_GAME_POINT_COST}
        onMaiaLockedClick={launch.openPointInfo}
        localSettings={localSettings}
        onSettingsChange={handleSettingsChange}
        showDerivedFromPgnHint={showDerivedFromPgnHint}
        isStartDisabled={isStartDisabled}
        isLoading={launch.isLoading}
        onStartGame={() => launch.start(engine)}
        previewSlot={<PgnPreview pgnMoves={pgnMoves} startingFen={startingFen} color={color} />}
      />
      <GameLaunchModals
        launch={launch}
        spendableBalance={maiaAccess.spendableBalance}
        locale={locale}
      />
    </>
  );
}
