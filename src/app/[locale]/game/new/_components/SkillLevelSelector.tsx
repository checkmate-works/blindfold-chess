'use client';

import { useTranslations } from 'next-intl';
import type { SkillLevel } from '../../../play/_lib/types';

interface SkillLevelSelectorProps {
  value: SkillLevel;
  onChange: (value: SkillLevel) => void;
}

export function SkillLevelSelector({ value, onChange }: SkillLevelSelectorProps) {
  const t = useTranslations('gameNew');
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">{t('selectLevel')}</h2>
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => onChange(1)}
          className={`p-4 rounded-lg border-2 transition-all ${
            value === 1
              ? 'border-foreground bg-foreground/10'
              : 'border-border hover:border-muted-foreground'
          }`}
        >
          <h3 className="font-semibold">{t('beginner')}</h3>
          <p className="text-sm text-muted-foreground mt-1">ELO ~1000</p>
        </button>

        <button
          onClick={() => onChange(5)}
          className={`p-4 rounded-lg border-2 transition-all ${
            value === 5
              ? 'border-foreground bg-foreground/10'
              : 'border-border hover:border-muted-foreground'
          }`}
        >
          <h3 className="font-semibold">{t('intermediate')}</h3>
          <p className="text-sm text-muted-foreground mt-1">ELO ~1500</p>
        </button>

        <button
          onClick={() => onChange(10)}
          className={`p-4 rounded-lg border-2 transition-all ${
            value === 10
              ? 'border-foreground bg-foreground/10'
              : 'border-border hover:border-muted-foreground'
          }`}
        >
          <h3 className="font-semibold">{t('advanced')}</h3>
          <p className="text-sm text-muted-foreground mt-1">ELO ~2000</p>
        </button>
      </div>
    </div>
  );
}
