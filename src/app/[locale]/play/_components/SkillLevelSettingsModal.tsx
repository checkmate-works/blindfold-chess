'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';

import { getEloRating } from '@/lib/chess/elo';
import type { SkillLevel } from '@/lib/types/game';

import { Modal } from '@/app/[locale]/_components/Modal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentSkillLevel: SkillLevel;
  onSkillLevelChange: (newSkillLevel: SkillLevel) => void;
};

export function SkillLevelSettingsModal({
  isOpen,
  onClose,
  currentSkillLevel,
  onSkillLevelChange,
}: Props) {
  const t = useTranslations('play');
  const [tempSkillLevel, setTempSkillLevel] = useState<SkillLevel>(currentSkillLevel);

  const handleSave = () => {
    onSkillLevelChange(tempSkillLevel);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  // Generate skill level options (1-20)
  const skillLevels = Array.from({ length: 20 }, (_, i) => i + 1) as SkillLevel[];

  return (
    <Modal
      isOpen={isOpen}
      title={t('configureSkillLevel')}
      onClose={handleCancel}
      maxWidth="max-w-md"
      key={isOpen ? 'open' : 'closed'}
    >
      <div className="space-y-6">
        {/* Skill Level Selector */}
        <div>
          <label htmlFor="skill-level" className="block text-sm font-medium text-foreground mb-2">
            {t('skillLevel')}
          </label>
          <select
            id="skill-level"
            value={tempSkillLevel}
            onChange={(e) => setTempSkillLevel(Number(e.target.value) as SkillLevel)}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {skillLevels.map((level) => (
              <option key={level} value={level}>
                {t('levelWithNumber', { level })} ({getEloRating(level)} ELO)
              </option>
            ))}
          </select>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-center pt-4 border-t border-border space-x-4">
          <Button variant="secondary" onClick={handleCancel}>
            {t('cancel')}
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {t('save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
