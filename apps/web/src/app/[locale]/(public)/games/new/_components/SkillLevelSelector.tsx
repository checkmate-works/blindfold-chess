'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { getEloForSkillLevel, isValidSkillLevel } from '@blindfold-chess/features/ai-game';
import { skillLevelToMaiaElo } from '@blindfold-chess/features/ai-game/maia';

import type { EngineKind } from '@/lib/engines';
import type { SkillLevel } from '@/lib/types';

type Props = {
  value: SkillLevel;
  onChange: (value: SkillLevel) => void;
  /**
   * Which engine the slider's level applies to. Stockfish maps level
   * 1..20 to its built-in skill_level (~800..3200 Elo). Maia maps the
   * same 1..20 onto its 1100..1900 training distribution via
   * {@link skillLevelToMaiaElo}. The Elo number on each option label
   * reflects the active engine's mapping. Defaults to `'stockfish'`
   * for backward compatibility.
   */
  engine?: EngineKind;
};

// Generate skill level options (1-20)
const SKILL_LEVELS: SkillLevel[] = Array.from({ length: 20 }, (_, i) => (i + 1) as SkillLevel);

/**
 * Difficulty picker driven by the existing 1..20 Stockfish skill-level
 * scale. The section header that used to live above this dropdown was
 * removed for being redundant ("Select AI Skill Level" duplicates the
 * dropdown labels), and the formerly-inline ELO explanation has moved
 * into the page-level `?` help tour so this control stays minimal.
 */
export function SkillLevelSelector({ value, onChange, engine = 'stockfish' }: Props) {
  const t = useTranslations('newGame');

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const level = parseInt(event.target.value, 10);
    if (isValidSkillLevel(level)) {
      onChange(level);
    }
  };

  const eloFor = (level: SkillLevel): number =>
    engine === 'maia' ? skillLevelToMaiaElo(level) : getEloForSkillLevel(level);

  return (
    <div data-tour-id="skill-level-selector">
      <select
        value={value}
        onChange={handleChange}
        aria-label={t('selectLevel')}
        className="w-full p-3 rounded-md border border-border bg-background text-foreground hover:border-muted-foreground focus:border-foreground focus:outline-none transition-all"
      >
        {SKILL_LEVELS.map((level) => (
          <option key={level} value={level}>
            {t('levelWithNumber', { level })} ({eloFor(level)} ELO)
          </option>
        ))}
      </select>
    </div>
  );
}
