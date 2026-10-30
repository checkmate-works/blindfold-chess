'use client';

import { useState } from 'react';

import { DEFAULT_MAIA_RATING, type MaiaRating } from '@blindfold-chess/features/ai-game/maia';

import { DEFAULT_ENGINE, type EngineConfig, type EngineKind } from '@/lib/engines';
import type { SkillLevel } from '@/lib/games/saved-game-types';

type Options = {
  /**
   * Engine to preselect. Accepts a lazy initializer so a form that derives
   * it from the URL (`initialEngineKind`) reads the param once, not on every
   * render.
   */
  initialEngine?: EngineKind | (() => EngineKind);
  initialSkillLevel?: SkillLevel;
  initialMaiaRating?: MaiaRating;
};

/**
 * Engine choice and difficulty state shared by the `/games/new/*` forms.
 *
 * Two parallel difficulty slots — Stockfish's 1..20 level and Maia's catalog
 * rating — are kept around so toggling between engines never loses the
 * user's previously-chosen value on either side. They are folded into a
 * single `EngineConfig` for navigation.
 */
export function useEngineSelection({
  initialEngine = DEFAULT_ENGINE,
  initialSkillLevel = 5,
  initialMaiaRating = DEFAULT_MAIA_RATING,
}: Options = {}) {
  const [engine, setEngine] = useState<EngineKind>(initialEngine);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(initialSkillLevel);
  const [maiaRating, setMaiaRating] = useState<MaiaRating>(initialMaiaRating);

  const engineConfig: EngineConfig =
    engine === 'maia' ? { kind: 'maia', rating: maiaRating } : { kind: 'stockfish', skillLevel };

  return { engine, setEngine, skillLevel, setSkillLevel, maiaRating, setMaiaRating, engineConfig };
}
