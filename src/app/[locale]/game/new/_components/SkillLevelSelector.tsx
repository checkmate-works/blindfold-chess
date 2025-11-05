'use client';

import { useTranslations } from 'next-intl';

import type { SkillLevel } from '@/lib/types';

type Props = {
  value: SkillLevel;
  onChange: (value: SkillLevel) => void;
};

// Generate skill level options (1-20)
const SKILL_LEVELS = Array.from({ length: 20 }, (_, i) => i + 1);

export function SkillLevelSelector({ value, onChange }: Props) {
  const t = useTranslations('newGame');

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const level = parseInt(event.target.value, 10);
    onChange(level);
  };

  return (
    <div className="space-y-2">
      <select
        value={value}
        onChange={handleChange}
        className="w-full p-3 rounded-lg border-2 border-border bg-background text-foreground hover:border-muted-foreground focus:border-foreground focus:outline-none transition-all"
      >
        {SKILL_LEVELS.map((level) => (
          <option key={level} value={level}>
            {t('levelWithNumber', { level })}
          </option>
        ))}
      </select>
      <p className="text-sm text-muted-foreground">{t('skillLevelDescription')}</p>
    </div>
  );
}
