'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { getEloForSkillLevel, isValidSkillLevel } from '@blindfold-chess/features/ai-game';
import {
  MAIA_RATINGS,
  type MaiaRating,
  isMaiaRating,
} from '@blindfold-chess/features/ai-game/maia';

import type { EngineKind } from '@/lib/engines';
import type { SkillLevel } from '@/lib/games/saved-game-types';

type Props = {
  engine: EngineKind;
  stockfishLevel: SkillLevel;
  onStockfishLevelChange: (value: SkillLevel) => void;
  maiaRating: MaiaRating;
  onMaiaRatingChange: (value: MaiaRating) => void;
};

const SKILL_LEVELS: SkillLevel[] = Array.from({ length: 20 }, (_, i) => (i + 1) as SkillLevel);

/**
 * Engine-aware difficulty picker. Stockfish exposes the existing 1..20
 * skill-level scale (mapped to ~800..3200 Elo). Maia exposes its
 * official 600..2600/step-200 catalog of trained ratings, matching the
 * maiachess.com "Play Maia" picker — values like 1140 or 1480 that the
 * old linear mapping produced are no longer reachable from the UI.
 *
 * Both engine states are passed through as separate fields so that
 * flipping the engine in {@link EngineSelector} does not clobber the
 * previously-chosen value on either side.
 */
export function SkillLevelSelector({
  engine,
  stockfishLevel,
  onStockfishLevelChange,
  maiaRating,
  onMaiaRatingChange,
}: Props) {
  const t = useTranslations('newGame');

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const parsed = parseInt(event.target.value, 10);
    if (engine === 'maia') {
      if (isMaiaRating(parsed)) onMaiaRatingChange(parsed);
      return;
    }
    if (isValidSkillLevel(parsed)) onStockfishLevelChange(parsed);
  };

  return (
    <div data-tour-id="skill-level-selector">
      <select
        value={engine === 'maia' ? maiaRating : stockfishLevel}
        onChange={handleChange}
        aria-label={t('selectLevel')}
        className="w-full p-3 rounded-md border border-border bg-background text-foreground hover:border-muted-foreground focus:border-foreground focus:outline-none transition-all"
      >
        {engine === 'maia'
          ? MAIA_RATINGS.map((rating) => (
              <option key={rating} value={rating}>
                {t('maiaRatingOption', { rating })}
              </option>
            ))
          : SKILL_LEVELS.map((level) => (
              <option key={level} value={level}>
                {t('levelWithNumber', { level })} ({getEloForSkillLevel(level)} ELO)
              </option>
            ))}
      </select>
    </div>
  );
}
