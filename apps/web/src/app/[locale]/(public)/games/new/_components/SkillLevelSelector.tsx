'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { getEloForSkillLevel, isValidSkillLevel } from '@blindfold-chess/features/ai-game';
import { skillLevelToMaiaElo } from '@blindfold-chess/features/ai-game/maia';
import { FaInfoCircle } from 'react-icons/fa';

import type { EngineKind } from '@/lib/engines';
import type { SkillLevel } from '@/lib/types';

import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';

import { SkillLevelInfoModal } from './SkillLevelInfoModal';

type Props = {
  value: SkillLevel;
  onChange: (value: SkillLevel) => void;
  /**
   * Which engine the slider's level applies to. Stockfish maps level
   * 1..20 to its built-in skill_level (~800..3200 Elo). Maia maps the
   * same 1..20 onto its 1100..1900 training distribution via
   * {@link skillLevelToMaiaElo}, so the Elo numbers shown in the
   * dropdown options change with the engine choice. Defaults to
   * `'stockfish'` for backward compatibility with existing call sites.
   */
  engine?: EngineKind;
};

// Generate skill level options (1-20)
const SKILL_LEVELS: SkillLevel[] = Array.from({ length: 20 }, (_, i) => (i + 1) as SkillLevel);

export function SkillLevelSelector({ value, onChange, engine = 'stockfish' }: Props) {
  const t = useTranslations('newGame');
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const level = parseInt(event.target.value, 10);
    if (isValidSkillLevel(level)) {
      onChange(level);
    }
  };

  /**
   * Engine-specific Elo label for a given level. Stockfish exposes a
   * single ELO number; Maia adds the "human-like" qualifier so the
   * player understands the rating refers to a *typical human at this
   * level*, not the engine's true playing strength.
   */
  const formatOption = (level: SkillLevel): string => {
    if (engine === 'maia') {
      return `${t('levelWithNumber', { level })} (${skillLevelToMaiaElo(level)} ${t('eloHumanLike')})`;
    }
    return `${t('levelWithNumber', { level })} (${getEloForSkillLevel(level)} ELO)`;
  };

  return (
    <>
      <div className="space-y-4">
        <SectionTitle>
          <span className="inline-flex items-center gap-2">
            {t('selectLevel')}
            <button
              type="button"
              onClick={() => setIsInfoModalOpen(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Show skill level information"
            >
              <FaInfoCircle className="w-4 h-4" />
            </button>
          </span>
        </SectionTitle>
        <select
          value={value}
          onChange={handleChange}
          className="w-full p-3 rounded-md border border-border bg-background text-foreground hover:border-muted-foreground focus:border-foreground focus:outline-none transition-all"
        >
          {SKILL_LEVELS.map((level) => (
            <option key={level} value={level}>
              {formatOption(level)}
            </option>
          ))}
        </select>
      </div>

      <SkillLevelInfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
    </>
  );
}
