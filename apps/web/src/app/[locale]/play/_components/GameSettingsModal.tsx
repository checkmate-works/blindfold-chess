'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';

import type { Side } from '@/lib/types';

import { Modal } from '@/app/[locale]/_components/Modal';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { GameSettingsContent } from '@/app/[locale]/preferences/_components/GameSettingsContent';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  playerSide?: Side;
  translationNamespace?: 'play' | 'postmortem';
};

export function GameSettingsModal({
  isOpen,
  onClose,
  playerSide = 'white',
  translationNamespace = 'play',
}: Props) {
  const t = useTranslations(translationNamespace);
  const { preferences, updatePreferences } = useGamePreferences();

  // Temporary settings state for preview
  const [tempSettings, setTempSettings] = useState(preferences);

  // Reset temp settings when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempSettings(preferences);
    }
  }, [isOpen, preferences]);

  const handleSave = () => {
    updatePreferences(tempSettings);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      title={t('configureBoardAppearance')}
      onClose={handleCancel}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-8">
        <GameSettingsContent
          settings={tempSettings}
          onSettingsChange={(updates) => setTempSettings({ ...tempSettings, ...updates })}
          playerSide={playerSide}
          showPreview={true}
          compact={true}
        />

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
