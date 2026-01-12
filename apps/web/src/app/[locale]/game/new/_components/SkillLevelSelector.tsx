'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { FaInfoCircle } from 'react-icons/fa';

import { getEloRating } from '@/lib/chess/elo';
import type { SkillLevel } from '@/lib/types';

import { SectionTitle } from '@/app/[locale]/_components';

import { SkillLevelInfoModal } from './SkillLevelInfoModal';

type Props = {
  value: SkillLevel;
  onChange: (value: SkillLevel) => void;
};

// Generate skill level options (1-20)
const SKILL_LEVELS = Array.from({ length: 20 }, (_, i) => i + 1);

export function SkillLevelSelector({ value, onChange }: Props) {
  const t = useTranslations('newGame');
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const level = parseInt(event.target.value, 10);
    onChange(level);
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <SectionTitle>{t('selectLevel')}</SectionTitle>
          <button
            type="button"
            onClick={() => setIsInfoModalOpen(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Show skill level information"
          >
            <FaInfoCircle className="w-4 h-4" />
          </button>
        </div>
        <select
          value={value}
          onChange={handleChange}
          className="w-full p-3 rounded-md border-2 border-border bg-background text-foreground hover:border-muted-foreground focus:border-foreground focus:outline-none transition-all"
        >
          {SKILL_LEVELS.map((level) => (
            <option key={level} value={level}>
              {t('levelWithNumber', { level })} ({getEloRating(level)} ELO)
            </option>
          ))}
        </select>
      </div>

      <SkillLevelInfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
    </>
  );
}
