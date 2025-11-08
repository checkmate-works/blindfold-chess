'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

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

  // Reset temp skill level when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempSkillLevel(currentSkillLevel);
    }
  }, [isOpen, currentSkillLevel]);

  const handleSave = () => {
    onSkillLevelChange(tempSkillLevel);
    onClose();
  };

  const handleCancel = () => {
    setTempSkillLevel(currentSkillLevel);
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
                {level}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-muted-foreground">{t('skillLevelDescription')}</p>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-center pt-4 border-t border-border space-x-4">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-background bg-foreground rounded-md hover:bg-foreground/90"
          >
            {t('save')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
