'use client';

import { useId } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import {
  DIFFICULTY_LEVELS,
  type DifficultyLevel,
} from '@/app/[locale]/(public)/preferences/_lib/difficulty-presets';

import { PreferenceOption } from './PreferenceOption';

type Props = {
  /** The rung the current settings sit on, or `null` for "Custom". */
  value: DifficultyLevel | null;
  onSelect: (level: DifficultyLevel) => void;
};

/**
 * The difficulty ladder: one radio per preset level, easiest first. "Custom"
 * is not a choice a player can pick — it only appears, already selected, when
 * the current settings match no level, so the group never shows nothing
 * selected. It is rendered disabled because selecting it would have nothing to
 * apply; the way into Custom is editing the controls under "Customize".
 */
export function DifficultyPresetPicker({ value, onSelect }: Props) {
  const t = useTranslations('Preferences');
  const name = useId();

  return (
    <div role="radiogroup" aria-label={t('game.difficulty.title')} className="space-y-2">
      {DIFFICULTY_LEVELS.map((level) => (
        <PreferenceOption
          key={level}
          type="radio"
          name={name}
          value={String(level)}
          checked={value === level}
          onChange={() => onSelect(level)}
          label={t('game.difficulty.level', { level })}
          description={t(`game.difficulty.levels.level${level}`)}
          descriptionPosition="bottom"
        />
      ))}
      {value === null && (
        <PreferenceOption
          type="radio"
          name={name}
          value="custom"
          checked
          onChange={() => {}}
          disabled
          label={t('game.difficulty.custom')}
          description={t('game.difficulty.customDescription')}
          descriptionPosition="bottom"
        />
      )}
    </div>
  );
}
